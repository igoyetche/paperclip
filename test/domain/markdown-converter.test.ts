import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { convertToMarkdown } from "../../src/domain/markdown-converter.js";

function htmlToDocument(html: string): Document {
  const dom = new JSDOM(html, { url: "https://localhost" });
  return dom.window.document;
}

const fixtureHtml = readFileSync(
  resolve(__dirname, "../fixtures/sample-article.html"),
  "utf-8",
);

describe("convertToMarkdown", () => {
  it("converts article HTML to Markdown", () => {
    const result = convertToMarkdown(htmlToDocument(fixtureHtml));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("# Test Article Title");
    expect(result.value).toContain("**first paragraph**");
    expect(result.value).toContain("[link](https://example.com/)");
    expect(result.value).toContain("## Section Two");
    expect(result.value).toContain("- Item one");
    expect(result.value).toContain("`const x = 42;`");
  });

  it("strips nav and footer content", () => {
    const result = convertToMarkdown(htmlToDocument(fixtureHtml));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).not.toContain("Home");
    expect(result.value).not.toContain("About");
    expect(result.value).not.toContain("Copyright");
  });

  it("returns ExtractionError for empty content", () => {
    const result = convertToMarkdown(htmlToDocument("<html><body></body></html>"));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("extraction");
  });

  it("returns ExtractionError for non-article pages", () => {
    const result = convertToMarkdown(htmlToDocument("<html><body><nav>Just nav</nav></body></html>"));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("extraction");
  });
});
