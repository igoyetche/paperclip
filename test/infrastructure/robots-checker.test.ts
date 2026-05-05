import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { RobotsChecker } from "../../src/infrastructure/robots-checker.js";

describe("RobotsChecker", () => {
  let checker: RobotsChecker;

  /**
   * Load fixture robots.txt file
   */
  function loadFixture(filename: string): string {
    const filePath = resolve("test/fixtures/robots", filename);
    return readFileSync(filePath, "utf-8");
  }

  describe("empty robots.txt", () => {
    beforeEach(() => {
      const emptyRobots = loadFixture("empty.txt");
      const mockFetcher = vi.fn(async () => emptyRobots);
      checker = new RobotsChecker(mockFetcher);
    });

    it("allows all URLs", async () => {
      const allowed1 = await checker.isAllowed("https://example.com/");
      const allowed2 = await checker.isAllowed("https://example.com/private/foo");
      const allowed3 = await checker.isAllowed("https://example.com/public/bar");

      expect(allowed1).toBe(true);
      expect(allowed2).toBe(true);
      expect(allowed3).toBe(true);
    });
  });

  describe("basic disallow rules", () => {
    beforeEach(() => {
      const basicRobots = loadFixture("basic.txt");
      const mockFetcher = vi.fn(async () => basicRobots);
      checker = new RobotsChecker(mockFetcher);
    });

    it("blocks URLs matching Disallow rules", async () => {
      const disallowed1 = await checker.isAllowed("https://example.com/private/foo");
      const disallowed2 = await checker.isAllowed("https://example.com/private/");
      const disallowed3 = await checker.isAllowed("https://example.com/admin/panel");

      expect(disallowed1).toBe(false);
      expect(disallowed2).toBe(false);
      expect(disallowed3).toBe(false);
    });

    it("allows URLs not matching Disallow rules", async () => {
      const allowed1 = await checker.isAllowed("https://example.com/");
      const allowed2 = await checker.isAllowed("https://example.com/public/foo");
      const allowed3 = await checker.isAllowed("https://example.com/about");

      expect(allowed1).toBe(true);
      expect(allowed2).toBe(true);
      expect(allowed3).toBe(true);
    });
  });

  describe("user-agent specific rules", () => {
    beforeEach(() => {
      const userAgentRobots = loadFixture("user-agent-specific.txt");
      const mockFetcher = vi.fn(async (_url: string, userAgent: string) => {
        // Verify user agent is passed
        expect(userAgent).toBeDefined();
        expect(userAgent.length).toBeGreaterThan(0);
        return userAgentRobots;
      });
      checker = new RobotsChecker(mockFetcher);
    });

    it("respects User-agent: * rules", async () => {
      const disallowed = await checker.isAllowed("https://example.com/no-all/page");
      expect(disallowed).toBe(false);
    });

    it("allows URLs not matching User-agent: * Disallow rules", async () => {
      const allowed = await checker.isAllowed("https://example.com/");
      expect(allowed).toBe(true);
    });

    it("applies User-agent specific rules correctly", async () => {
      // The "no-google" path is only disallowed for googlebot, not for our user agent
      const allowed = await checker.isAllowed("https://example.com/no-google/page");
      expect(allowed).toBe(true);
    });
  });

  describe("caching behavior", () => {
    it("fetches robots.txt only once per host", async () => {
      const basicRobots = loadFixture("basic.txt");
      const mockFetcher = vi.fn(async () => basicRobots);
      checker = new RobotsChecker(mockFetcher);

      // Make multiple requests to the same host
      await checker.isAllowed("https://example.com/page1");
      await checker.isAllowed("https://example.com/page2");
      await checker.isAllowed("https://example.com/page3");

      // Fetcher should only be called once
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it("maintains separate caches for different hosts", async () => {
      const basicRobots = loadFixture("basic.txt");
      const mockFetcher = vi.fn(async (url: string) => {
        // Return empty robots for any host
        return basicRobots;
      });
      checker = new RobotsChecker(mockFetcher);

      // Make requests to different hosts
      await checker.isAllowed("https://example.com/page");
      await checker.isAllowed("https://other-example.com/page");
      await checker.isAllowed("https://another.com/page");

      // Fetcher should be called three times (once per host)
      expect(mockFetcher).toHaveBeenCalledTimes(3);
    });
  });

  describe("error handling", () => {
    it("treats fetch failure (404) as permissive", async () => {
      const mockFetcher = vi.fn(async () => null); // Simulate 404 by returning null
      checker = new RobotsChecker(mockFetcher);

      const allowed1 = await checker.isAllowed("https://example.com/private/");
      const allowed2 = await checker.isAllowed("https://example.com/admin/");

      expect(allowed1).toBe(true);
      expect(allowed2).toBe(true);
    });

    it("treats malformed robots.txt as permissive", async () => {
      const mockFetcher = vi.fn(async () => "This is not valid robots.txt content at all");
      checker = new RobotsChecker(mockFetcher);

      const allowed = await checker.isAllowed("https://example.com/any/path");
      expect(allowed).toBe(true);
    });

    it("handles invalid URLs gracefully", async () => {
      const basicRobots = loadFixture("basic.txt");
      const mockFetcher = vi.fn(async () => basicRobots);
      checker = new RobotsChecker(mockFetcher);

      // Invalid URLs should be treated as allowed (don't block on parsing errors)
      const allowed = await checker.isAllowed("not a valid url");
      expect(allowed).toBe(true);
    });
  });

  describe("user-agent consistency", () => {
    it("uses the same user-agent for all calls within an instance", async () => {
      const basicRobots = loadFixture("basic.txt");
      const userAgents = new Set<string>();
      const mockFetcher = vi.fn(async (_url: string, userAgent: string) => {
        userAgents.add(userAgent);
        return basicRobots;
      });
      checker = new RobotsChecker(mockFetcher);

      // Make multiple requests
      await checker.isAllowed("https://example.com/page1");
      await checker.isAllowed("https://other.com/page2");

      // All calls should use the same user agent
      expect(userAgents.size).toBe(1);
      const userAgent = Array.from(userAgents)[0];
      expect(userAgent).toMatch(/^paperclip-crawler/);
    });
  });

  describe("complex URL patterns", () => {
    beforeEach(() => {
      const basicRobots = loadFixture("basic.txt");
      const mockFetcher = vi.fn(async () => basicRobots);
      checker = new RobotsChecker(mockFetcher);
    });

    it("handles URLs with query parameters", async () => {
      const disallowed = await checker.isAllowed(
        "https://example.com/private/page?query=value&foo=bar",
      );
      expect(disallowed).toBe(false);
    });

    it("handles URLs with fragments", async () => {
      const disallowed = await checker.isAllowed("https://example.com/private/page#section");
      expect(disallowed).toBe(false);
    });

    it("handles URLs with port numbers", async () => {
      // Port should be part of the host in the cache lookup
      const allowed = await checker.isAllowed("https://example.com:8443/public/page");
      expect(allowed).toBe(true);
    });

    it("distinguishes between hosts with same path", async () => {
      // These should be treated as different hosts
      const url1 = await checker.isAllowed("https://example.com/private/");
      const url2 = await checker.isAllowed("https://examplecomfake.com/private/");

      // url1 should be disallowed by example.com's robots.txt
      expect(url1).toBe(false);
      // url2 should be allowed by examplecomfake.com's robots.txt (which is the same but fetched separately)
      expect(url2).toBe(false);
    });
  });

  describe("real robots-parser integration", () => {
    /**
     * This test uses real robots-parser library (not mocked)
     * to ensure actual compatibility
     */
    it("works with real robots-parser library for real robots.txt content", async () => {
      // Create a real-world robots.txt content
      const realRobotsTxt = `User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /public/
Allow: /files/

User-agent: googlebot
Allow: /

Crawl-delay: 10`;

      const mockFetcher = vi.fn(async () => realRobotsTxt);
      checker = new RobotsChecker(mockFetcher);

      // Test various paths
      expect(await checker.isAllowed("https://example.com/")).toBe(true);
      expect(await checker.isAllowed("https://example.com/public/page")).toBe(true);
      expect(await checker.isAllowed("https://example.com/files/document.pdf")).toBe(true);
      expect(await checker.isAllowed("https://example.com/admin/dashboard")).toBe(false);
      expect(await checker.isAllowed("https://example.com/private/data")).toBe(false);
    });
  });
});
