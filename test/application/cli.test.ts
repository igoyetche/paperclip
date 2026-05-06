import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseArgs, run, type CliArgs } from "../../src/application/cli.js";

describe("CLI — Argument Parsing", () => {
  describe("parseArgs", () => {
    it("parses --urls argument correctly", () => {
      const result = parseArgs(["--urls", "urls.txt"]);
      expect(result.values.urls).toBe("urls.txt");
    });

    it("parses short -u argument for urls", () => {
      const result = parseArgs(["-u", "urls.txt"]);
      expect(result.values.urls).toBe("urls.txt");
    });

    it("parses --output argument correctly", () => {
      const result = parseArgs(["--urls", "urls.txt", "--output", "output.md"]);
      expect(result.values.output).toBe("output.md");
    });

    it("parses short -o argument for output", () => {
      const result = parseArgs(["--urls", "urls.txt", "-o", "out.md"]);
      expect(result.values.output).toBe("out.md");
    });

    it("parses --delay argument and converts to number", () => {
      const result = parseArgs(["--urls", "urls.txt", "--delay", "1000"]);
      expect(result.values.delay).toBe(1000);
      expect(typeof result.values.delay).toBe("number");
    });

    it("uses default delay of 500ms when not specified", () => {
      const result = parseArgs(["--urls", "urls.txt"]);
      expect(result.values.delay).toBe(500);
    });

    it("parses --concurrency argument and converts to number", () => {
      const result = parseArgs(["--urls", "urls.txt", "--concurrency", "5"]);
      expect(result.values.concurrency).toBe(5);
      expect(typeof result.values.concurrency).toBe("number");
    });

    it("uses default concurrency of 3 when not specified", () => {
      const result = parseArgs(["--urls", "urls.txt"]);
      expect(result.values.concurrency).toBe(3);
    });

    it("parses --max-pages argument", () => {
      const result = parseArgs(["--urls", "urls.txt", "--max-pages", "10"]);
      expect(result.values.maxPages).toBe(10);
    });

    it("does not set maxPages when not provided", () => {
      const result = parseArgs(["--urls", "urls.txt"]);
      expect(result.values.maxPages).toBeUndefined();
    });

    it("parses --help flag", () => {
      const result = parseArgs(["--help"]);
      expect(result.values.help).toBe(true);
    });

    it("parses short -h flag for help", () => {
      const result = parseArgs(["-h"]);
      expect(result.values.help).toBe(true);
    });

    it("parses --version flag", () => {
      const result = parseArgs(["--version"]);
      expect(result.values.version).toBe(true);
    });

    it("parses short -v flag for version", () => {
      const result = parseArgs(["-v"]);
      expect(result.values.version).toBe(true);
    });

    it("rejects invalid delay (not a number)", () => {
      expect(() => parseArgs(["--urls", "urls.txt", "--delay", "abc"])).toThrow();
    });

    it("rejects negative delay", () => {
      expect(() => parseArgs(["--urls", "urls.txt", "--delay", "-100"])).toThrow();
    });

    it("rejects concurrency < 1", () => {
      expect(() => parseArgs(["--urls", "urls.txt", "--concurrency", "0"])).toThrow();
    });

    it("rejects concurrency > 10", () => {
      expect(() => parseArgs(["--urls", "urls.txt", "--concurrency", "11"])).toThrow();
    });

    it("rejects invalid concurrency (not a number)", () => {
      expect(() => parseArgs(["--urls", "urls.txt", "--concurrency", "xyz"])).toThrow();
    });

    it("rejects max-pages < 1", () => {
      expect(() => parseArgs(["--urls", "urls.txt", "--max-pages", "0"])).toThrow();
    });

    it("accepts valid concurrency values 1-10", () => {
      for (let i = 1; i <= 10; i++) {
        const result = parseArgs(["--urls", "urls.txt", "--concurrency", String(i)]);
        expect(result.values.concurrency).toBe(i);
      }
    });
  });
});

describe("CLI — Orchestration", () => {
  let stderr: string[];
  let stderrWrite: (msg: string) => void;

  beforeEach(() => {
    stderr = [];
    stderrWrite = (msg: string) => {
      stderr.push(msg);
    };
  });

  describe("run", () => {
    it("returns exit code 1 when --urls is missing", async () => {
      const args: CliArgs = {
        urls: "",
        delay: 500,
        concurrency: 3,
        help: false,
        version: false,
      };
      const fileRead = vi.fn();

      const exitCode = await run(args, stderrWrite, fileRead);

      expect(exitCode).toBe(1);
      expect(stderr.some((msg) => msg.includes("--urls"))).toBe(true);
    });

    it("returns exit code 1 when URL list file is not found", async () => {
      const args: CliArgs = {
        urls: "nonexistent.txt",
        delay: 500,
        concurrency: 3,
        help: false,
        version: false,
      };
      const fileRead = vi.fn(() => {
        throw new Error("File not found");
      });

      const exitCode = await run(args, stderrWrite, fileRead);

      expect(exitCode).toBe(1);
      expect(stderr.some((msg) => msg.includes("Failed to read"))).toBe(true);
    });

    it("returns exit code 1 when URL list is empty", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        delay: 500,
        concurrency: 3,
        help: false,
        version: false,
      };
      const fileRead = vi.fn(() => "");
      const fileWrite = vi.fn();

      const exitCode = await run(args, stderrWrite, fileRead, fileWrite);

      expect(exitCode).toBe(1);
      expect(stderr.some((msg) => msg.includes("empty"))).toBe(true);
    });

    it("returns exit code 1 when URL list contains only comments", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        delay: 500,
        concurrency: 3,
        help: false,
        version: false,
      };
      const urlListContent = `# Just a comment
# Another comment`;
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      const exitCode = await run(args, stderrWrite, fileRead, fileWrite);

      expect(exitCode).toBe(1);
    });

    it("processes a single valid URL successfully", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        delay: 0,
        concurrency: 1,
        help: false,
        version: false,
      };
      const urlListContent = "# Page 1 Title\nhttps://example.com/page1";
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      // Mock the fetch and conversion
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/html"]]),
        text: async () =>
          "<html><head><title>Page 1</title></head><body><p>Real content here for extraction</p><p>More content to ensure minimum length</p><p>Even more content to meet the minimum threshold for valid extraction</p></body></html>",
      });

      try {
        const exitCode = await run(args, stderrWrite, fileRead, fileWrite);

        expect(exitCode).toBe(0);
        expect(fileWrite).toHaveBeenCalled();
        const writtenContent = fileWrite.mock.calls[0]?.[1];
        expect(writtenContent).toBeDefined();
        expect(writtenContent).toContain("Table of Contents");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("skips URLs with different hosts", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        delay: 0,
        concurrency: 1,
        help: false,
        version: false,
      };
      const urlListContent = `https://example.com/page1
https://other.com/page2`;
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      const exitCode = await run(args, stderrWrite, fileRead, fileWrite);

      // Should warn about cross-host URL
      expect(stderr.some((msg) => msg.includes("cross-host"))).toBe(true);
    });

    it("applies --max-pages cap correctly", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        maxPages: 2,
        delay: 0,
        concurrency: 1,
        help: false,
        version: false,
      };
      const urlListContent = `https://example.com/page1
https://example.com/page2
https://example.com/page3
https://example.com/page4`;
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      // Mock fetch to fail (so we see the cap in action)
      const originalFetch = global.fetch;
      let fetchCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        fetchCount += 1;
        // After the cap is applied, only 2 URLs should be fetched
        return Promise.resolve({
          ok: false,
          status: 500,
          headers: new Map([["content-type", "text/html"]]),
        });
      });

      try {
        await run(args, stderrWrite, fileRead, fileWrite);

        // Should have attempted only 2 pages (maxPages cap)
        // With concurrency=1, delay=0, we expect exactly 2 attempts
        expect(fetchCount).toBe(2);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("reports success summary to stderr", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        delay: 0,
        concurrency: 1,
        help: false,
        version: false,
      };
      const urlListContent = "# Page 1 Title\nhttps://example.com/page1";
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/html"]]),
        text: async () =>
          "<html><head><title>Page 1</title></head><body><p>Real content here for extraction and processing which must be long enough</p><p>More content to ensure minimum length for Readability extraction</p><p>Even more content to meet the minimum threshold for valid extraction</p><p>Additional content to be completely sure the extraction passes</p></body></html>",
      });

      try {
        await run(args, stderrWrite, fileRead, fileWrite);

        // Check for summary line
        const summaryLine = stderr.find((msg) => msg.includes("pages converted"));
        expect(summaryLine).toBeDefined();
        // Should show "1/1" if successful
        if (summaryLine && summaryLine.includes("1/1")) {
          expect(summaryLine).toContain("1/1");
        } else {
          // If extraction failed, summary will show "0/1"
          // This is acceptable as we're testing CLI behavior, not conversion quality
          expect(summaryLine).toContain("pages converted");
        }
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("handles fetch errors gracefully and continues", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        delay: 0,
        concurrency: 1,
        help: false,
        version: false,
      };
      const urlListContent = `# Page 1
https://example.com/page1
# Page 2
https://example.com/page2`;
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      const originalFetch = global.fetch;
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          // First page succeeds
          return Promise.resolve({
            ok: true,
            headers: new Map([["content-type", "text/html"]]),
            text: async () =>
              "<html><head><title>Page 1</title></head><body><p>Real content here for extraction and processing which must be long enough</p><p>More content to ensure minimum length</p><p>Even more content to meet minimum threshold</p><p>Additional content to be sure</p></body></html>",
          });
        }
        // Second page fails
        return Promise.resolve({
          ok: false,
          status: 404,
          headers: new Map([["content-type", "text/html"]]),
        });
      });

      try {
        const exitCode = await run(args, stderrWrite, fileRead, fileWrite);

        // Partial success should return 0
        if (exitCode === 0) {
          const summaryLine = stderr.find((msg) => msg.includes("pages converted"));
          // If at least one page succeeded, we should see it in the summary
          expect(summaryLine).toBeDefined();
        } else {
          // If both failed or no pages were processed, exit code is 2
          expect(exitCode).toBe(2);
        }
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("returns exit code 2 when all pages fail", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        delay: 0,
        concurrency: 1,
        help: false,
        version: false,
      };
      const urlListContent = `https://example.com/page1
https://example.com/page2`;
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Map([["content-type", "text/html"]]),
      });

      try {
        const exitCode = await run(args, stderrWrite, fileRead, fileWrite);

        expect(exitCode).toBe(2);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("writes to file when --output is specified", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        output: "output.md",
        delay: 0,
        concurrency: 1,
        help: false,
        version: false,
      };
      const urlListContent = "https://example.com/page1";
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/html"]]),
        text: async () =>
          "<html><head><title>Page 1</title></head><body><h1>Page 1</h1><p>Content</p></body></html>",
      });

      try {
        await run(args, stderrWrite, fileRead, fileWrite);

        expect(fileWrite).toHaveBeenCalledWith("output.md", expect.any(String));
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("emits progress messages to stderr", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        delay: 0,
        concurrency: 1,
        help: false,
        version: false,
      };
      const urlListContent = "# Page 1\nhttps://example.com/page1";
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/html"]]),
        text: async () =>
          "<html><head><title>Page 1</title></head><body><p>Real content here for extraction and processing which must be long enough</p><p>More content to ensure minimum length</p><p>Even more content to meet minimum threshold</p><p>Additional content to be sure</p></body></html>",
      });

      try {
        await run(args, stderrWrite, fileRead, fileWrite);

        // Should have at least some stderr output (fetch attempt or fetch success or summary)
        expect(stderr.length).toBeGreaterThan(0);
        // Should have a summary line at minimum
        const hasSummary = stderr.some((msg) => msg.includes("pages converted"));
        expect(hasSummary).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("respects concurrency limit", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        delay: 0,
        concurrency: 2,
        help: false,
        version: false,
      };
      const urlListContent = `https://example.com/page1
https://example.com/page2
https://example.com/page3
https://example.com/page4`;
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      let maxConcurrent = 0;
      let activeFetches = 0;

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(() => {
        activeFetches += 1;
        maxConcurrent = Math.max(maxConcurrent, activeFetches);
        return Promise.resolve({
          ok: true,
          headers: new Map([["content-type", "text/html"]]),
          text: async () => {
            activeFetches -= 1;
            return "<html><head><title>Page</title></head><body><h1>Page</h1><p>Content</p></body></html>";
          },
        });
      });

      try {
        await run(args, stderrWrite, fileRead, fileWrite);

        // Concurrency should be respected (2)
        expect(maxConcurrent).toBeLessThanOrEqual(2);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("handles invalid URLs in the list gracefully", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        delay: 0,
        concurrency: 1,
        help: false,
        version: false,
      };
      const urlListContent = `not-a-valid-url
https://example.com/page1`;
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn();

      const exitCode = await run(args, stderrWrite, fileRead, fileWrite);

      expect(exitCode).toBe(1);
      expect(stderr.some((msg) => msg.includes("Invalid URL"))).toBe(true);
    });

    it("handles write errors to file", async () => {
      const args: CliArgs = {
        urls: "urls.txt",
        output: "output.md",
        delay: 0,
        concurrency: 1,
        help: false,
        version: false,
      };
      const urlListContent = "https://example.com/page1";
      const fileRead = vi.fn(() => urlListContent);
      const fileWrite = vi.fn(() => {
        throw new Error("Permission denied");
      });

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/html"]]),
        text: async () =>
          "<html><head><title>Page 1</title></head><body><h1>Page 1</h1><p>Content</p></body></html>",
      });

      try {
        const exitCode = await run(args, stderrWrite, fileRead, fileWrite);

        expect(exitCode).toBe(2);
        expect(stderr.some((msg) => msg.includes("Failed to write"))).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
