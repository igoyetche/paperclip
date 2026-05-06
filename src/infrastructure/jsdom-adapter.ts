import { JSDOM } from "jsdom";

/**
 * Implements Task 7: jsdom adapter
 * Thin wrapper around jsdom for HTML parsing into a DOM Document.
 *
 * Implements §3 of the spec:
 * - FR-6: Parse fetched HTML into a DOM for title resolution and Markdown conversion
 */

/**
 * Parses an HTML string into a jsdom Document object.
 *
 * The `baseUrl` parameter is critical for relative-link resolution.
 * It ensures that links like `../other-page` are resolved correctly by jsdom.
 *
 * @param html The HTML string to parse
 * @param baseUrl The base URL for resolving relative links (e.g., the page's canonical URL)
 * @returns A jsdom Document object that can be used with domain functions like resolveTitle and convertToMarkdown
 *
 * @throws May throw if jsdom encounters invalid HTML or encoding issues; caller should handle errors
 *
 * @example
 * const html = '<html><head><title>My Page</title></head><body><h1>Welcome</h1></body></html>';
 * const doc = parseHtml(html, 'https://example.com/page');
 * // Use doc with resolveTitle(entry, doc) and convertToMarkdown(doc)
 */
export function parseHtml(html: string, baseUrl: string): Document {
  const dom = new JSDOM(html, {
    url: baseUrl,
  });
  return dom.window.document;
}
