import { FetchError } from "../domain/errors.js";
import { err, ok, type Result } from "../domain/errors.js";

/**
 * Implements Task 5: HTTP fetcher
 * Wraps Node 22's native fetch with timeout, User-Agent, and error categorization.
 *
 * Implements §5 of the spec:
 * - FR-7: Fetch HTML content from URLs
 * - NFR-3: Configurable timeout and per-worker delay
 * - NFR-5: Error categorization (http, network, timeout, content_type)
 */

/**
 * Options for the HTTP fetcher
 */
export interface FetchOptions {
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** User-Agent header value */
  userAgent: string;
}

/**
 * Fetches HTML content from a URL with timeout, User-Agent header, and error categorization.
 *
 * @param url The URL to fetch
 * @param options Fetch options (timeoutMs and userAgent)
 * @returns Result with HTML string on success, FetchError on failure
 *
 * Error categorization:
 * - HTTP non-2xx → FetchError("http", status)
 * - Network error → FetchError("network", message)
 * - Timeout → FetchError("timeout")
 * - Non-HTML content-type → FetchError("content_type", contentType)
 */
export async function fetchHtml(
  url: string,
  options: FetchOptions,
): Promise<Result<string, FetchError>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": options.userAgent,
      },
    });

    // Check HTTP status code
    if (!response.ok) {
      return err(new FetchError("http", response.status));
    }

    // Check Content-Type header
    const contentType = response.headers.get("content-type");
    if (contentType) {
      // Allow text/html or application/xhtml+xml
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        return err(new FetchError("content_type", contentType));
      }
    }

    // Read response body as text
    const html = await response.text();
    return ok(html);
  } catch (error) {
    // Distinguish between timeout and other network errors
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return err(new FetchError("timeout"));
      }
      // Network error (e.g., ECONNREFUSED, ENOTFOUND)
      return err(new FetchError("network", error.message));
    }

    // Fallback for non-Error thrown objects
    return err(new FetchError("network", "Unknown network error"));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generates the User-Agent string for the HTTP fetcher.
 * Format: paperclip-crawler/{version} (+https://github.com/igoyetche/paperclip)
 *
 * @returns The User-Agent string
 */
export async function getUserAgentString(): Promise<string> {
  // Dynamically import package.json to get the version
  const packageJson = await import("../../package.json", {
    assert: { type: "json" },
  });
  const version = (packageJson.default as Record<string, unknown>).version || "0.0.0";
  return `paperclip-crawler/${version} (+https://github.com/igoyetche/paperclip)`;
}
