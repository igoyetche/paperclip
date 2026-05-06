import type { Result } from "./errors.js";
import { ok, err, UrlListParseError } from "./errors.js";

/**
 * A parsed entry from a URL list.
 * Implements the §4.1 format: optional title-comment above a URL.
 */
export interface UrlListEntry {
  readonly url: string;
  readonly title?: string;
}

/**
 * Return type for parseUrlList.
 * Includes parsed entries and any warnings (e.g., duplicate URLs encountered).
 */
export interface ParseUrlListResult {
  readonly entries: UrlListEntry[];
  readonly warnings: string[];
}

/**
 * Parses a URL list in the §4.1 format.
 *
 * Format rules:
 * - Lines starting with '#' are comments
 * - A comment immediately preceding a URL (no blank line between) becomes its title
 * - Blank lines separate comments from URLs (comment is ignored if blank line follows)
 * - Duplicate URLs are kept only once; a warning is emitted
 * - Invalid URLs cause a parse error with line number
 *
 * Implements FR-15 (URL list format) and NFR-4 (duplicate detection).
 *
 * @param content The raw URL list content (supports both LF and CRLF line endings)
 * @returns Result containing ParseUrlListResult (entries + warnings) or UrlListParseError
 */
export function parseUrlList(
  content: string,
): Result<ParseUrlListResult, UrlListParseError> {
  // Normalize line endings (CRLF → LF) then split
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  const entries: UrlListEntry[] = [];
  const warnings: string[] = [];
  const seenUrls = new Set<string>();

  let activeComment: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue; // Defensive check (noUncheckedIndexedAccess)

    const lineNumber = i + 1; // 1-indexed for user-facing messages

    // Trim whitespace
    const trimmed = line.trim();

    // Empty line: reset active comment (it's no longer immediately preceding)
    if (trimmed.length === 0) {
      activeComment = undefined;
      continue;
    }

    // Comment line: extract the comment text (strip leading '#' and whitespace)
    if (trimmed.startsWith("#")) {
      const commentText = trimmed.slice(1).trim();
      activeComment = commentText;
      continue;
    }

    // Non-empty, non-comment line: treat as a URL
    // Validate the URL
    let urlStr: string;
    try {
      // new URL() will throw if the URL is invalid
      const parsed = new URL(trimmed);
      urlStr = parsed.href;
    } catch {
      return err(
        new UrlListParseError(
          lineNumber,
          `Invalid URL: "${trimmed}"`,
        ),
      );
    }

    // Check for duplicates
    if (seenUrls.has(urlStr)) {
      warnings.push(`Line ${lineNumber}: Duplicate URL skipped: ${urlStr}`);
      activeComment = undefined;
      continue;
    }

    // Record the URL and associate the active comment (if any) as its title
    seenUrls.add(urlStr);
    entries.push({
      url: urlStr,
      title: activeComment,
    });

    // Reset active comment (it has been consumed)
    activeComment = undefined;
  }

  return ok({ entries, warnings });
}
