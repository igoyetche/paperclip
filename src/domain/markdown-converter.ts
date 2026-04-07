import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { type Result, ok, err, ExtractionError } from "./errors.js";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

turndown.addRule("inlineCode", {
  filter(node) {
    return (
      node.nodeName === "PRE" &&
      node.firstChild !== null &&
      (node.firstChild as Element).nodeName === "CODE"
    );
  },
  replacement(_content, node) {
    const code = (node as Element).querySelector("code");
    const text = code?.textContent ?? _content;
    return "`" + text + "`";
  },
});

export function convertToMarkdown(doc: Document): Result<string, ExtractionError> {
  const clonedDoc = doc.cloneNode(true) as Document;
  const reader = new Readability(clonedDoc);
  const article = reader.parse();

  if (!article?.content) {
    return err(new ExtractionError("Could not extract article content from this page"));
  }

  const cleanedHtml = article.content
    // Strip zero-width characters that break Markdown formatting
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // Remove empty inline formatting elements left behind
    .replace(/<(strong|b|em|i)>\s*<\/\1>/gi, "")
    // Move leading whitespace outside inline formatting elements
    .replace(/<(strong|b|em|i)>(\s+)/gi, "$2<$1>")
    // Move trailing whitespace outside inline formatting elements
    .replace(/(\s+)<\/(strong|b|em|i)>/gi, "</$2>$1");

  const raw = turndown.turndown(cleanedHtml);
  const markdown = raw
    // Normalize list items: replace "- " followed by extra spaces with "- "
    .replace(/^(-|\*|\d+\.) {2,}/gm, "$1 ")
    // Strip inline footnote links: \[[1](#f1n)\] or [\[1\]](#f1n) → [1]
    .replace(/\\\[\[(\d+)\]\([^)]*\)\\\]/g, "[$1]")
    .replace(/\[\\\[(\d+)\\\]\]\([^)]*\)/g, "[$1]")
    // Unescape footnote-style brackets: \[1\] or \[\n\n1\] → [1]
    .replace(/\\\[\s*(\d+)\\\]/g, "[$1]")
    // Merge closing ** from its own line to end of previous line
    .replace(/(\S)[ \t]*\n[ \t]*\*\*[ \t]*$/gm, "$1**")
    // Merge opening ** from its own line to start of next line
    .replace(/^[ \t]*\*\*[ \t]*\n(?=\S)/gm, "**")
    .trim();

  if (markdown.length < 20) {
    return err(new ExtractionError("Could not extract article content from this page"));
  }

  return ok(markdown);
}
