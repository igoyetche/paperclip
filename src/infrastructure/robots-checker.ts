import robotsParser from "robots-parser";
import { fetchHtml, getUserAgentString } from "./http-fetcher.js";

/**
 * Implements Task 6: robots.txt checker
 * Per-host robots.txt fetching, caching, and URL allow/disallow checking.
 *
 * Implements §6 of the spec (NFR-4):
 * - Step 6.1: Cache one robots-parser instance per host
 * - Step 6.2: Fetch robots.txt on first call; treat errors as fully-permissive
 * - Step 6.3: Use consistent User-Agent when checking rules
 * - Step 6.4: Comprehensive testing with fixture robots.txt files
 */

/**
 * Stub parser that allows all URLs (used when robots.txt is not found or errors)
 */
interface RobotsParserInstance {
  isAllowed(url: string, userAgent?: string): boolean;
}

class PermissiveRobotsParser implements RobotsParserInstance {
  isAllowed(): boolean {
    return true;
  }
}

/**
 * Checks if a URL is allowed by the host's robots.txt
 */
export class RobotsChecker {
  /** Cache of robots-parser instances keyed by host */
  private readonly cache: Map<string, RobotsParserInstance>;

  /** User-Agent string to use when checking rules */
  private userAgent: string | null = null;

  /** Fetcher function (injected for testing, uses HTTP fetcher by default) */
  private readonly fetchFn: (url: string, userAgent: string) => Promise<string | null>;

  constructor(
    fetchFn?: (url: string, userAgent: string) => Promise<string | null>,
  ) {
    this.cache = new Map();
    this.fetchFn = fetchFn || this.defaultFetcher.bind(this);
  }

  /**
   * Default fetcher that uses the HTTP fetcher (Task 5)
   */
  private async defaultFetcher(url: string, userAgent: string): Promise<string | null> {
    const result = await fetchHtml(url, {
      timeoutMs: 5000,
      userAgent,
    });

    if (result.ok) {
      return result.value;
    }

    // On any fetch error (404, timeout, network, etc.), return null
    return null;
  }

  /**
   * Checks if a URL is allowed by the host's robots.txt
   *
   * @param url The URL to check (must be a valid absolute URL)
   * @returns true if allowed, false if disallowed
   */
  async isAllowed(url: string): Promise<boolean> {
    // Lazy-initialize user agent on first call
    if (this.userAgent === null) {
      this.userAgent = await getUserAgentString();
    }

    // Extract host from URL
    let host: string;
    try {
      const parsed = new URL(url);
      host = parsed.host;
    } catch {
      // Invalid URL - treat as allowed (don't block on bad URLs)
      return true;
    }

    // Check cache
    let parser = this.cache.get(host);
    if (!parser) {
      // Fetch and cache robots.txt for this host
      parser = await this.fetchAndParseRobots(host);
      this.cache.set(host, parser);
    }

    // Check if URL is allowed
    return parser.isAllowed(url, this.userAgent);
  }

  /**
   * Fetches and parses robots.txt for a host
   *
   * @param host The host to fetch robots.txt from
   * @returns A parsed robots object or a permissive stub on error
   */
  private async fetchAndParseRobots(host: string): Promise<RobotsParserInstance> {
    const robotsUrl = `https://${host}/robots.txt`;

    try {
      const content = await this.fetchFn(robotsUrl, this.userAgent!);

      if (!content) {
        // Fetch error (404, timeout, network) - return permissive parser
        return new PermissiveRobotsParser();
      }

      // Parse the robots.txt content using robots-parser
      const parsed = robotsParser(robotsUrl, content);
      return parsed;
    } catch {
      // On any parse error, return permissive parser
      return new PermissiveRobotsParser();
    }
  }
}
