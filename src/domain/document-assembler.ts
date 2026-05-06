/**
 * A page assembled from a fetched URL with its title and converted markdown content.
 *
 * The `markdown` field contains the raw output from the existing `convertToMarkdown` function.
 */
export interface AssembledPage {
  readonly title: string;
  readonly markdown: string;
}

/**
 * Assembles multiple pages into a single concatenated Markdown document with TOC.
 *
 * Implements FR-9 (Table of Contents with links) and FR-10 (page sections with anchors).
 *
 * Format:
 * - Emits `## Table of Contents\n\n` followed by `- [Title](#page-N)` entries (1-indexed)
 * - Blank line
 * - For each page: `\n---\n\n<a id="page-N"></a>\n\n# {title}\n\n{markdown}\n`
 * - Strips any leading H1 from markdown if it matches the page title (avoid double H1)
 *
 * Empty input returns an empty string (no header when there are no pages).
 *
 * @param pages Array of assembled pages
 * @returns The complete concatenated Markdown document
 */
export function assembleDocument(pages: AssembledPage[]): string {
  // Empty input: return empty string (no header for zero pages)
  if (pages.length === 0) {
    return "";
  }

  // Build table of contents
  const tocLines: string[] = ["## Table of Contents"];
  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1; // 1-indexed
    const title = pages[i]!.title;
    // Note: CommonMark link syntax is standard; special chars in the title are passed through unescaped
    // The anchor link format [Title](#page-N) is deterministic and collision-free per spec §8.6
    tocLines.push(`- [${title}](#page-${pageNum})`);
  }
  tocLines.push(""); // Blank line after TOC

  const sections: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1; // 1-indexed
    const page = pages[i]!;

    // Strip leading H1 if it matches the page title (avoid double heading)
    const markdown = stripMatchingLeadingH1(page.markdown, page.title);

    // Build the section: separator + anchor + heading + markdown
    const section = `\n---\n\n<a id="page-${pageNum}"></a>\n\n# ${page.title}\n\n${markdown}\n`;
    sections.push(section);
  }

  // Concatenate TOC and all sections
  return tocLines.join("\n") + sections.join("");
}

/**
 * Strips a leading H1 from the markdown if it exactly matches the provided title.
 * Used to avoid duplicate headings when a page's first H1 matches the resolved title.
 *
 * @param markdown The markdown content to process
 * @param title The page title to match against
 * @returns The markdown with the leading H1 removed if it matched, or the original markdown
 */
function stripMatchingLeadingH1(markdown: string, title: string): string {
  // Match a leading H1: `# Title` possibly preceded/followed by whitespace
  // The H1 must be at the very start (after trimming leading whitespace)
  const trimmed = markdown.trimStart();

  // Pattern: "# " followed by one or more spaces, then content that may have trailing spaces,
  // followed by newline or end of string. We match greedily up to the newline to capture
  // the full title including any trailing spaces, then trim it for comparison.
  const h1Pattern = /^# +(.+?)(?:\n|$)/;
  const match = trimmed.match(h1Pattern);

  if (!match) {
    // No leading H1 found
    return markdown;
  }

  const extractedTitle = match[1];
  if (extractedTitle === undefined) {
    return markdown;
  }

  // Compare the extracted title (with trailing spaces trimmed) to the page title
  if (extractedTitle.trim() === title) {
    // Exact match (after trimming): strip the H1 and return the rest
    const leadingWhitespace = markdown.length - trimmed.length;
    const afterH1 = trimmed.slice(match[0]!.length);
    // Return the part after H1, without artificial re-indenting
    return afterH1;
  }

  // No match: return original markdown
  return markdown;
}
