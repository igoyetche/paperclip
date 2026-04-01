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

  const raw = turndown.turndown(article.content);
  // Normalize list items: replace "- " followed by extra spaces with "- "
  const markdown = raw.replace(/^(-|\*|\d+\.) {2,}/gm, "$1 ").trim();

  if (markdown.length < 20) {
    return err(new ExtractionError("Could not extract article content from this page"));
  }

  return ok(markdown);
}
