import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { resolveTitle } from "../../src/domain/title-resolver.js";
import type { UrlListEntry } from "../../src/domain/url-list-parser.js";

function htmlToDocument(html: string, baseUrl: string = "https://example.com"): Document {
  const dom = new JSDOM(html, { url: baseUrl });
  return dom.window.document;
}

describe("resolveTitle", () => {
  describe("Priority 1: title-comment from URL list entry", () => {
    it("returns title-comment verbatim when provided", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
        title: "Custom Title",
      };
      const doc = htmlToDocument('<html><body><h1>H1 Title</h1></body></html>');

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Custom Title");
    });

    it("returns title-comment even when H1 and page title are present", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
        title: "Comment Title",
      };
      const doc = htmlToDocument(
        '<html><head><title>Page Title</title></head><body><h1>H1 Title</h1></body></html>'
      );

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Comment Title");
    });

    it("trims whitespace from title-comment", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
        title: "  Padded Title  ",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Padded Title");
    });

    it("ignores empty or whitespace-only title-comment", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
        title: "   ",
      };
      const doc = htmlToDocument('<html><head><title>Page Title</title></head><body></body></html>');

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Page Title");
    });

    it("preserves special characters in title-comment", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
        title: "API Reference — Section [Advanced]",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("API Reference — Section [Advanced]");
    });
  });

  describe("Priority 2: first <h1> in document", () => {
    it("returns first H1 when title-comment is absent", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument('<html><body><h1>Page Heading</h1></body></html>');

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Page Heading");
    });

    it("returns first H1 when multiple H1s are present", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument(
        '<html><body><h1>First Heading</h1><h1>Second Heading</h1></body></html>'
      );

      const result = resolveTitle(entry, doc);

      expect(result).toBe("First Heading");
    });

    it("trims whitespace from H1 text", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument('<html><body><h1>   Padded Heading   </h1></body></html>');

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Padded Heading");
    });

    it("ignores empty H1", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument(
        '<html><head><title>Page Title</title></head><body><h1>   </h1></body></html>'
      );

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Page Title");
    });

    it("prefers H1 over page title when both are present", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument(
        '<html><head><title>Browser Tab Title</title></head><body><h1>Main Heading</h1></body></html>'
      );

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Main Heading");
    });

    it("handles H1 with HTML entities", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument('<html><body><h1>Title &amp; Subtitle</h1></body></html>');

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Title & Subtitle");
    });
  });

  describe("Priority 3: page <title>", () => {
    it("returns page title when title-comment and H1 are absent", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument('<html><head><title>Page Title</title></head><body></body></html>');

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Page Title");
    });

    it("trims whitespace from page title", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument(
        '<html><head><title>   Padded Title   </title></head><body></body></html>'
      );

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Padded Title");
    });

    it("ignores empty title tag", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument(
        '<html><head><title>   </title></head><body></body></html>'
      );

      // Falls through to URL slug since H1 is also absent
      const result = resolveTitle(entry, doc);

      // URL is https://example.com/page, so last segment is "page"
      expect(result).toBe("Page");
    });

    it("returns page title as-is without heuristic suffix stripping", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      // Per spec: do not strip " - SiteName" suffix heuristically
      const doc = htmlToDocument(
        '<html><head><title>Page Title - My Site</title></head><body></body></html>'
      );

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Page Title - My Site");
    });

    it("handles page title with special characters", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument(
        '<html><head><title>Café & Restaurant — Paris</title></head><body></body></html>'
      );

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Café & Restaurant — Paris");
    });
  });

  describe("Priority 4: URL slug fallback", () => {
    it("extracts and title-cases the last path segment", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/getting-started",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Getting Started");
    });

    it("replaces hyphens with spaces", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/my-first-article",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("My First Article");
    });

    it("replaces underscores with spaces", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/my_long_article_name",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("My Long Article Name");
    });

    it("title-cases the result", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/introduction-to-programming",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Introduction To Programming");
    });

    it("decodes percent-encoded path segments", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/caf%C3%A9-guide",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Café Guide");
    });

    it("handles mixed hyphens and underscores", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/my-article_part-one",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("My Article Part One");
    });

    it("handles multiple consecutive hyphens", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/article--with--multiple--dashes",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      // Multiple dashes become multiple spaces, which are collapsed later
      expect(result).toContain("Article");
      expect(result).toContain("Multiple");
      expect(result).toContain("Dashes");
    });

    it("handles path with trailing slash", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/article-name/",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Article Name");
    });

    it("handles numeric path segments", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/2024/05/article-title",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      // Takes the last segment
      expect(result).toBe("Article Title");
    });

    it("falls back to hostname for root URL with no H1 or title", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("example.com");
    });

    it("falls back to hostname for root URL without trailing slash", () => {
      const entry: UrlListEntry = {
        url: "https://example.com",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("example.com");
    });

    it("handles URL with complex subdomain", () => {
      const entry: UrlListEntry = {
        url: "https://docs.example.co.uk/getting-started",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Getting Started");
    });

    it("handles URL with query parameters and fragments", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/article-name?query=value&other=123#section",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Article Name");
    });

    it("handles single-letter path segments", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/a-b-c",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("A B C");
    });

    it("handles path with numbers and hyphens", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/lesson-1-part-2",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Lesson 1 Part 2");
    });
  });

  describe("Edge cases and robustness", () => {
    it("always returns a non-empty string", () => {
      const entry: UrlListEntry = {
        url: "https://example.com",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result.length).toBeGreaterThan(0);
    });

    it("handles document with no head or body", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument("");

      const result = resolveTitle(entry, doc);

      // Falls through to URL slug
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles malformed H1 with nested tags", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/page",
      };
      const doc = htmlToDocument(
        '<html><body><h1>Title with <strong>bold</strong> text</h1></body></html>'
      );

      const result = resolveTitle(entry, doc);

      expect(result).toContain("Title");
      expect(result).toContain("bold");
    });

    it("handles whitespace-only H1 after trimming", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/article-title",
      };
      const doc = htmlToDocument(
        '<html><head><title></title></head><body><h1>   \n\n   </h1></body></html>'
      );

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Article Title");
    });

    it("handles URL with non-ASCII characters in path", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/café-français",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toContain("Café");
      expect(result).toContain("Français");
    });

    it("handles corrupted percent-encoding gracefully", () => {
      const entry: UrlListEntry = {
        url: "https://example.com/%ZZ-invalid",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      // Should still produce a title even if decoding fails
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns Untitled for completely unparseable URL (theoretical)", () => {
      // Note: In practice, this is hard to trigger since we validate at parse time,
      // but the fallback is defensive.
      const entry: UrlListEntry = {
        url: "not-a-valid-url",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Untitled");
    });
  });

  describe("Real-world examples from spec", () => {
    it("handles promptingguide.ai style pages", () => {
      const entry: UrlListEntry = {
        url: "https://www.promptingguide.ai/introduction",
        title: "Introduction",
      };
      const doc = htmlToDocument(
        '<html><head><title>Prompt Engineering Guide</title></head><body><h1>Getting Started</h1></body></html>'
      );

      const result = resolveTitle(entry, doc);

      // Title-comment takes priority
      expect(result).toBe("Introduction");
    });

    it("derives title from URL when page has no H1 or title", () => {
      const entry: UrlListEntry = {
        url: "https://www.promptingguide.ai/techniques/zeroshot",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(result).toBe("Zeroshot");
    });

    it("handles documentation site with metadata H1", () => {
      const entry: UrlListEntry = {
        url: "https://docs.example.com/api/endpoints",
      };
      const doc = htmlToDocument(
        '<html><head><title>API Endpoints | Docs</title></head><body><h1>REST Endpoints Reference</h1></body></html>'
      );

      const result = resolveTitle(entry, doc);

      expect(result).toBe("REST Endpoints Reference");
    });
  });

  describe("Type safety and integration", () => {
    it("accepts UrlListEntry with optional title", () => {
      const entryWithTitle: UrlListEntry = {
        url: "https://example.com",
        title: "Title",
      };
      const entryWithoutTitle: UrlListEntry = {
        url: "https://example.com",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      expect(() => resolveTitle(entryWithTitle, doc)).not.toThrow();
      expect(() => resolveTitle(entryWithoutTitle, doc)).not.toThrow();
    });

    it("returns a string (not Result type)", () => {
      const entry: UrlListEntry = {
        url: "https://example.com",
      };
      const doc = htmlToDocument("<html><body></body></html>");

      const result = resolveTitle(entry, doc);

      expect(typeof result).toBe("string");
    });
  });
});
