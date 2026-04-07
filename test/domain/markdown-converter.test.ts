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

  it("unescapes footnote-style brackets", () => {
    const html = `<html><body><article>
      <h1>Essay</h1>
      <p>${"x ".repeat(50)}</p>
      <p><b>Notes</b></p>
      <p>[1] First footnote about something important.</p>
      <p>[2] Second footnote with more detail.</p>
    </article></body></html>`;

    const result = convertToMarkdown(htmlToDocument(html));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("[1]");
    expect(result.value).toContain("[2]");
    expect(result.value).not.toContain("\\[");
  });

  it("strips inline footnote links when brackets are inside the anchor", () => {
    const html = `<html><body><article>
      <h1>Essay</h1>
      <p>${"x ".repeat(50)}</p>
      <p>Something interesting. <a href="#f1n">[1]</a></p>
      <p>Another point here. <a href="#f2n">[2]</a></p>
    </article></body></html>`;

    const result = convertToMarkdown(htmlToDocument(html));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("[1]");
    expect(result.value).toContain("[2]");
    expect(result.value).not.toContain("#f1n");
    expect(result.value).not.toContain("#f2n");
  });

  it("strips inline footnote links when brackets are outside the anchor", () => {
    const html = `<html><body><article>
      <h1>Essay</h1>
      <p>${"x ".repeat(50)}</p>
      <p>Something interesting. [<a href="#f1n">1</a>]</p>
      <p>Another point here. [<a href="#f2n">2</a>]</p>
    </article></body></html>`;

    const result = convertToMarkdown(htmlToDocument(html));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("[1]");
    expect(result.value).toContain("[2]");
    expect(result.value).not.toContain("#f1n");
    expect(result.value).not.toContain("#f2n");
  });

  it("preserves Markdown links when unescaping footnotes", () => {
    const html = `<html><body><article>
      <h1>Article</h1>
      <p>${"x ".repeat(50)}</p>
      <p>Read more at <a href="https://example.com">this link</a> for details.</p>
      <p>[1] A footnote reference.</p>
    </article></body></html>`;

    const result = convertToMarkdown(htmlToDocument(html));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("[this link](https://example.com/)");
    expect(result.value).toContain("[1]");
  });

  it("removes zero-width joiners that create empty bold markers", () => {
    const html = `<html><body><article>
      <h1>Article</h1>
      <p>${"x ".repeat(50)}</p>
      <p>Some text.<strong>\u200D</strong></p>
      <p><strong>\u200D</strong>More text here.</p>
    </article></body></html>`;

    const result = convertToMarkdown(htmlToDocument(html));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("Some text.");
    expect(result.value).toContain("More text here.");
    expect(result.value).not.toContain("**");
  });

  it("fixes bold with leading whitespace inside strong tags", () => {
    const html = `<html><body><article>
      <h1>Article</h1>
      <p>${"x ".repeat(50)}</p>
      <p><strong>  \nThis is important.</strong> And this is not.</p>
    </article></body></html>`;

    const result = convertToMarkdown(htmlToDocument(html));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("**This is important.**");
  });

  it("merges closing ** from its own line to previous line", () => {
    const html = `<html><body><article>
      <h1>Article</h1>
      <p>${"x ".repeat(50)}</p>
      <p><strong>Important heading<br></strong></p>
    </article></body></html>`;

    const result = convertToMarkdown(htmlToDocument(html));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("**Important heading**");
    expect(result.value).not.toMatch(/^\s*\*\*\s*$/m);
  });

  it("merges opening ** from its own line to next line", () => {
    const html = `<html><body><article>
      <h1>Article</h1>
      <p>${"x ".repeat(50)}</p>
      <p><strong><br>This is bold.</strong></p>
    </article></body></html>`;

    const result = convertToMarkdown(htmlToDocument(html));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("**This is bold.**");
    expect(result.value).not.toMatch(/^\s*\*\*\s*$/m);
  });

  it("fixes bold with trailing whitespace inside strong tags", () => {
    const html = `<html><body><article>
      <h1>Article</h1>
      <p>${"x ".repeat(50)}</p>
      <p><strong>Important heading  \n</strong></p>
    </article></body></html>`;

    const result = convertToMarkdown(htmlToDocument(html));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("**Important heading**");
    expect(result.value).not.toMatch(/\*\*\s+\*\*/);
  });

  it("returns ExtractionError for non-article pages", () => {
    const result = convertToMarkdown(htmlToDocument("<html><body><nav>Just nav</nav></body></html>"));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("extraction");
  });
});
