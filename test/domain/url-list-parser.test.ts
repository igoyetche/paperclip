import { describe, it, expect } from "vitest";
import {
  parseUrlList,
  type UrlListEntry,
  type ParseUrlListResult,
} from "../../src/domain/url-list-parser.js";
import { UrlListParseError } from "../../src/domain/errors.js";

describe("parseUrlList", () => {
  describe("basic format compliance", () => {
    it("handles blank file", () => {
      const result = parseUrlList("");

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toEqual([]);
      expect(result.value.warnings).toEqual([]);
    });

    it("handles file with only whitespace", () => {
      const result = parseUrlList("   \n\n  \n");

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toEqual([]);
      expect(result.value.warnings).toEqual([]);
    });

    it("parses pure URLs without comments", () => {
      const input = "https://example.com\nhttps://example.org";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(2);
      expect(result.value.entries[0]).toEqual({
        url: "https://example.com/",
        title: undefined,
      });
      expect(result.value.entries[1]).toEqual({
        url: "https://example.org/",
        title: undefined,
      });
      expect(result.value.warnings).toEqual([]);
    });
  });

  describe("title comment handling", () => {
    it("associates comment immediately above URL as title", () => {
      const input = "# First Page\nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(1);
      expect(result.value.entries[0]).toEqual({
        url: "https://example.com/",
        title: "First Page",
      });
    });

    it("ignores comment separated from URL by blank line", () => {
      const input = "# Orphaned Comment\n\nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(1);
      expect(result.value.entries[0]).toEqual({
        url: "https://example.com/",
        title: undefined,
      });
    });

    it("ignores trailing comment with no following URL", () => {
      const input = "https://example.com\n# Trailing Comment";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(1);
      expect(result.value.entries[0]).toEqual({
        url: "https://example.com/",
        title: undefined,
      });
    });

    it("picks immediately-preceding comment from multiple stacked comments", () => {
      const input =
        "# First Comment\n# Second Comment\n# Third Comment\nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(1);
      expect(result.value.entries[0]).toEqual({
        url: "https://example.com/",
        title: "Third Comment",
      });
    });

    it("handles comments with special characters", () => {
      const input = "# Title: Overview [Section A]\nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries[0]?.title).toBe("Title: Overview [Section A]");
    });
  });

  describe("whitespace handling", () => {
    it("trims leading/trailing whitespace from URLs", () => {
      const input = "  https://example.com  \n  https://example.org  ";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(2);
      expect(result.value.entries[0]).toEqual({
        url: "https://example.com/",
        title: undefined,
      });
      expect(result.value.entries[1]).toEqual({
        url: "https://example.org/",
        title: undefined,
      });
    });

    it("trims leading/trailing whitespace from comment text", () => {
      const input = "#   Padded Comment Text   \nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries[0]?.title).toBe("Padded Comment Text");
    });

    it("preserves internal whitespace in titles", () => {
      const input = "# A Long Multi Word Title\nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries[0]?.title).toBe("A Long Multi Word Title");
    });

    it("handles comment with only '#' and spaces", () => {
      const input = "#   \nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Empty comment text is treated as activeComment = ""
      expect(result.value.entries[0]?.title).toBe("");
    });
  });

  describe("line ending handling", () => {
    it("handles LF line endings", () => {
      const input = "https://example.com\nhttps://example.org";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(2);
    });

    it("handles CRLF line endings", () => {
      const input = "https://example.com\r\nhttps://example.org\r\n";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(2);
      expect(result.value.entries[0]).toEqual({
        url: "https://example.com/",
        title: undefined,
      });
    });

    it("handles mixed CRLF and LF", () => {
      const input = "# Title A\r\nhttps://example.com\n# Title B\r\nhttps://example.org";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(2);
      expect(result.value.entries[0]?.title).toBe("Title A");
      expect(result.value.entries[1]?.title).toBe("Title B");
    });
  });

  describe("URL validation", () => {
    it("normalizes URLs to full form", () => {
      const input = "https://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // URL constructor normalizes to trailing slash
      expect(result.value.entries[0]?.url).toBe("https://example.com/");
    });

    it("rejects invalid URL", () => {
      const input = "not a url at all";
      const result = parseUrlList(input);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toBeInstanceOf(UrlListParseError);
      expect(result.error.lineNumber).toBe(1);
      expect(result.error.message).toContain("Invalid URL");
    });

    it("includes line number in error for invalid URL", () => {
      const input =
        "https://example.com\nhttps://example.org\ninvalid url here";
      const result = parseUrlList(input);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.lineNumber).toBe(3);
    });

    it("accepts various valid URL schemes", () => {
      const input = "http://example.com\nhttps://secure.example.com\nfile:///path/to/file";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(3);
      expect(result.value.entries[0]?.url).toContain("http://");
      expect(result.value.entries[1]?.url).toContain("https://");
      expect(result.value.entries[2]?.url).toContain("file://");
    });

    it("accepts URLs with paths and query strings", () => {
      const input = "https://example.com/path/to/page?query=value&foo=bar";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries[0]?.url).toContain("/path/to/page");
      expect(result.value.entries[0]?.url).toContain("query=value");
    });

    it("rejects empty URL (line with just whitespace)", () => {
      // Empty trimmed line is treated as blank, not a URL, so no error
      // But let's test a malformed URL instead
      const input = "   \nhttps://";
      const result = parseUrlList(input);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.lineNumber).toBe(2);
    });
  });

  describe("duplicate URL handling (NFR-4)", () => {
    it("keeps only the first occurrence of a duplicate URL", () => {
      const input =
        "# First\nhttps://example.com\n# Second\nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(1);
      expect(result.value.entries[0]?.title).toBe("First");
    });

    it("emits warning for duplicate URL", () => {
      const input =
        "# First\nhttps://example.com\n# Second\nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.warnings).toHaveLength(1);
      expect(result.value.warnings[0]).toContain("Duplicate");
      expect(result.value.warnings[0]).toContain("example.com");
      expect(result.value.warnings[0]).toContain("Line 4");
    });

    it("normalizes URLs before duplicate checking (trailing slash)", () => {
      const input = "https://example.com\nhttps://example.com/";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Both normalize to https://example.com/, so one should be skipped
      expect(result.value.entries).toHaveLength(1);
      expect(result.value.warnings).toHaveLength(1);
    });

    it("detects duplicates across multiple URLs", () => {
      const input =
        "https://a.com\nhttps://b.com\nhttps://a.com\nhttps://c.com\nhttps://b.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(3); // a.com, b.com, c.com
      expect(result.value.warnings).toHaveLength(2); // Two duplicates
    });
  });

  describe("complex real-world scenarios", () => {
    it("parses a realistic URL list", () => {
      const input = `# Introduction
https://example.com/intro

# Getting Started
https://example.com/getting-started

# Advanced Topics
https://example.com/advanced/part-1
https://example.com/advanced/part-2

# FAQ
https://example.com/faq`;

      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(5);
      expect(result.value.entries[0]?.title).toBe("Introduction");
      expect(result.value.entries[1]?.title).toBe("Getting Started");
      expect(result.value.entries[2]?.title).toBe("Advanced Topics");
      expect(result.value.entries[3]?.title).toBeUndefined();
      expect(result.value.entries[4]?.title).toBe("FAQ");
    });

    it("handles URLs at the end without trailing newline", () => {
      const input = "# Last Page\nhttps://example.com/last";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(1);
      expect(result.value.entries[0]?.title).toBe("Last Page");
    });

    it("handles multiple consecutive blank lines", () => {
      const input = "# Title 1\nhttps://example.com/1\n\n\n\n# Title 2\nhttps://example.com/2";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(2);
      expect(result.value.entries[0]?.title).toBe("Title 1");
      expect(result.value.entries[1]?.title).toBe("Title 2");
      expect(result.value.warnings).toHaveLength(0);
    });

    it("handles URLs with Unicode characters in path", () => {
      const input = "https://example.com/café/résumé";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries).toHaveLength(1);
    });

    it("handles comment lines with hash but no space", () => {
      const input = "#NoSpace\nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entries[0]?.title).toBe("NoSpace");
    });

    it("handles comment lines with multiple hashes", () => {
      const input = "## Heading Style Comment\nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // The first # is stripped, leaving "# Heading Style Comment"
      expect(result.value.entries[0]?.title).toBe("# Heading Style Comment");
    });
  });

  describe("return type structure", () => {
    it("returns ParseUrlListResult with entries and warnings", () => {
      const input = "https://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const parsed: ParseUrlListResult = result.value;
      expect(parsed).toHaveProperty("entries");
      expect(parsed).toHaveProperty("warnings");
      expect(Array.isArray(parsed.entries)).toBe(true);
      expect(Array.isArray(parsed.warnings)).toBe(true);
    });

    it("entries contain UrlListEntry objects", () => {
      const input = "# Title\nhttps://example.com";
      const result = parseUrlList(input);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const entry: UrlListEntry = result.value.entries[0] as UrlListEntry;
      expect(entry).toHaveProperty("url");
      expect(entry).toHaveProperty("title");
      expect(typeof entry.url).toBe("string");
      expect(
        entry.title === undefined || typeof entry.title === "string",
      ).toBe(true);
    });
  });
});
