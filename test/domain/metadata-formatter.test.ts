import { describe, it, expect } from "vitest";
import { formatMetadata } from "../../src/domain/metadata-formatter.js";

describe("formatMetadata", () => {
  it("generates YAML frontmatter with title, url, and date", () => {
    const result = formatMetadata({
      title: "My Article",
      url: "https://example.com/article",
      date: new Date("2026-03-31"),
    });

    expect(result).toBe(
      [
        "---",
        "title: My Article",
        "url: https://example.com/article",
        "date: 2026-03-31",
        "---",
        "",
      ].join("\n"),
    );
  });

  it("escapes titles containing YAML special characters", () => {
    const result = formatMetadata({
      title: 'Title with "quotes" and: colons',
      url: "https://example.com",
      date: new Date("2026-01-01"),
    });

    expect(result).toContain('title: "Title with \\"quotes\\" and: colons"');
  });

  it("handles empty title", () => {
    const result = formatMetadata({
      title: "",
      url: "https://example.com",
      date: new Date("2026-01-01"),
    });

    expect(result).toContain('title: ""');
  });
});
