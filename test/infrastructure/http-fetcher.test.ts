import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchHtml, getUserAgentString } from "../../src/infrastructure/http-fetcher.js";

describe("http-fetcher", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("fetchHtml", () => {
    const testUrl = "https://example.com/page";
    const testUserAgent = "test-agent/1.0";
    const options = { timeoutMs: 5000, userAgent: testUserAgent };

    it("returns HTML string on successful 200 response with HTML content-type", async () => {
      const htmlContent = "<html><body>Test Content</body></html>";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "text/html; charset=utf-8"]]),
        text: async () => htmlContent,
      });

      const result = await fetchHtml(testUrl, options);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(htmlContent);
      }
      expect(mockFetch).toHaveBeenCalledWith(testUrl, {
        signal: expect.any(AbortSignal),
        headers: { "User-Agent": testUserAgent },
      });
    });

    it("accepts application/xhtml+xml content-type", async () => {
      const htmlContent = "<html><body>XHTML Content</body></html>";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/xhtml+xml"]]),
        text: async () => htmlContent,
      });

      const result = await fetchHtml(testUrl, options);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(htmlContent);
      }
    });

    it("returns FetchError with http kind on 404 status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map([["content-type", "text/html"]]),
      });

      const result = await fetchHtml(testUrl, options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("http");
        expect(result.error.detail).toBe(404);
      }
    });

    it("returns FetchError with http kind on 500 status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Map([["content-type", "text/html"]]),
      });

      const result = await fetchHtml(testUrl, options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("http");
        expect(result.error.detail).toBe(500);
      }
    });

    it("returns FetchError with content_type kind when response is not HTML", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/pdf"]]),
        text: async () => "PDF content",
      });

      const result = await fetchHtml(testUrl, options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("content_type");
        expect(result.error.detail).toBe("application/pdf");
      }
    });

    it("returns FetchError with network kind on network error", async () => {
      const networkError = new Error("ECONNREFUSED");
      mockFetch.mockRejectedValueOnce(networkError);

      const result = await fetchHtml(testUrl, options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("network");
        expect(result.error.detail).toBe("ECONNREFUSED");
      }
    });

    it("returns FetchError with timeout kind when abort signal triggers timeout", async () => {
      mockFetch.mockImplementationOnce(
        async (_url: string, options: { signal: AbortSignal }) => {
          // Simulate the abort signal being triggered
          if (options.signal.aborted) {
            throw new DOMException("Aborted", "AbortError");
          }
          // In real scenario, we abort the signal before fetch completes
          // For testing, we'll trigger the abort error directly
          const error = new Error("Timeout");
          error.name = "AbortError";
          throw error;
        },
      );

      const result = await fetchHtml(testUrl, { timeoutMs: 100, userAgent: testUserAgent });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("timeout");
      }
    });

    it("handles non-Error thrown objects as network errors", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const result = await fetchHtml(testUrl, options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("network");
        expect(result.error.detail).toBe("Unknown network error");
      }
    });

    it("proceeds without content-type header if missing", async () => {
      const htmlContent = "<html><body>Test</body></html>";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => htmlContent,
      });

      const result = await fetchHtml(testUrl, options);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(htmlContent);
      }
    });

    it("sets the correct User-Agent header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => "<html></html>",
      });

      const customUserAgent = "my-custom-agent/2.0";
      await fetchHtml(testUrl, { timeoutMs: 5000, userAgent: customUserAgent });

      expect(mockFetch).toHaveBeenCalledWith(
        testUrl,
        expect.objectContaining({
          headers: { "User-Agent": customUserAgent },
        }),
      );
    });

    it("includes AbortSignal in fetch call", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => "<html></html>",
      });

      await fetchHtml(testUrl, options);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      if (callArgs) {
        const [_url, fetchOptions] = callArgs;
        expect(fetchOptions).toHaveProperty("signal");
        expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
      }
    });
  });

  describe("getUserAgentString", () => {
    it("returns a string matching the expected format", async () => {
      const userAgent = await getUserAgentString();

      expect(userAgent).toMatch(/^paperclip-crawler\/\d+\.\d+\.\d+/);
      expect(userAgent).toContain("+https://github.com/igoyetche/paperclip");
    });

    it("includes the version from package.json", async () => {
      const userAgent = await getUserAgentString();

      // package.json has version 0.1.0
      expect(userAgent).toContain("0.1.0");
    });
  });
});
