import type { UrlListEntry } from "./url-list-parser.js";

/**
 * Resolves a page title using the priority chain: title-comment → first <h1> → <title> → URL slug.
 * Always returns a non-empty string.
 *
 * Implements §4.1 of the spec: "Title resolution priority in the CLI: title-comment from URL list
 * → first `<h1>` in the fetched page → page `<title>` → URL path slug."
 *
 * @param entry The parsed URL list entry (may include an optional title-comment)
 * @param doc The parsed HTML document (from jsdom or browser DOM)
 * @returns A non-empty title string
 */
export function resolveTitle(entry: UrlListEntry, doc: Document): string {
  // Priority 1: title-comment from URL list entry (if provided)
  if (entry.title && entry.title.trim().length > 0) {
    return entry.title.trim();
  }

  // Priority 2: first <h1> in the document
  const h1 = doc.querySelector("h1");
  if (h1 && h1.textContent && h1.textContent.trim().length > 0) {
    return h1.textContent.trim();
  }

  // Priority 3: page <title>
  const titleElement = doc.querySelector("title");
  if (titleElement && titleElement.textContent && titleElement.textContent.trim().length > 0) {
    return titleElement.textContent.trim();
  }

  // Priority 4: URL slug fallback
  return urlSlugFallback(entry.url);
}

/**
 * Generates a title from a URL by extracting the last non-empty path segment,
 * decoding percent-encoding, replacing hyphens/underscores with spaces, and title-casing.
 * If the URL has no path (root), uses the host name.
 *
 * @param urlStr The URL string
 * @returns A title string
 */
function urlSlugFallback(urlStr: string): string {
  try {
    const url = new URL(urlStr);

    // If the URL is a root URL (no path or just "/"), use the host
    const pathname = url.pathname;
    if (pathname === "/" || pathname.length === 0) {
      return url.hostname;
    }

    // Extract the last non-empty path segment
    const segments = pathname.split("/").filter((seg) => seg.length > 0);
    if (segments.length === 0) {
      return url.hostname;
    }

    const lastSegment = segments[segments.length - 1];
    if (lastSegment === undefined) {
      return url.hostname;
    }

    // Decode percent-encoding
    let decoded: string;
    try {
      decoded = decodeURIComponent(lastSegment);
    } catch {
      // If decoding fails, use the segment as-is
      decoded = lastSegment;
    }

    // Replace hyphens and underscores with spaces
    const withSpaces = decoded.replace(/[-_]/g, " ");

    // Title-case: capitalize first letter of each word
    const titleCased = withSpaces
      .split(/\s+/)
      .map((word) => {
        if (word.length === 0) return "";
        return word[0]!.toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");

    // Return the title, or fall back to hostname if empty
    return titleCased.length > 0 ? titleCased : url.hostname;
  } catch {
    // If URL parsing fails, return a fallback
    return "Untitled";
  }
}
