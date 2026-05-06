import { parseArgs as utilParseArgs } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { parseUrlList } from "../domain/url-list-parser.js";
import { resolveTitle } from "../domain/title-resolver.js";
import { assembleDocument } from "../domain/document-assembler.js";
import { convertToMarkdown } from "../domain/markdown-converter.js";
import { fetchHtml, getUserAgentString } from "../infrastructure/http-fetcher.js";
import { RobotsChecker } from "../infrastructure/robots-checker.js";
import { parseHtml } from "../infrastructure/jsdom-adapter.js";
import { runWithConcurrency } from "../infrastructure/concurrency-runner.js";
import type { UrlListEntry, ParseUrlListResult } from "../domain/url-list-parser.js";
import type { AssembledPage } from "../domain/document-assembler.js";

/**
 * Implements Task 9: CLI entry point
 * Orchestrates argument parsing, URL list loading, concurrent fetching, conversion, and output.
 *
 * Implements §5 of the spec (Paperclip CLI requirements):
 * - FR-7, FR-11-17: Full multi-URL orchestration
 * - NFR-3, NFR-4, NFR-5, NFR-6, NFR-8: Performance, safety, observability, determinism, build integration
 */

/**
 * Command-line arguments for the CLI
 */
export interface CliArgs {
  urls: string;
  output?: string;
  delay: number;
  concurrency: number;
  maxPages?: number;
  help: boolean;
  version: boolean;
}

/**
 * Parsed arguments from the command line
 */
export interface ParsedArgs {
  values: CliArgs;
  positionals: string[];
}

/**
 * Parses command-line arguments using Node's native parseArgs.
 * Implements Step 9.1.
 *
 * @param argv The raw argv array (typically process.argv.slice(2))
 * @returns ParsedArgs with typed values and positionals
 * @throws Error if arguments are invalid
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const result = utilParseArgs({
    args: argv,
    options: {
      urls: {
        type: "string",
        short: "u",
      },
      output: {
        type: "string",
        short: "o",
      },
      delay: {
        type: "string",
        default: "500",
      },
      concurrency: {
        type: "string",
        default: "3",
      },
      "max-pages": {
        type: "string",
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
      version: {
        type: "boolean",
        short: "v",
        default: false,
      },
    },
    allowPositionals: true,
    strict: true,
  });

  // Parse numeric values
  const delay = parseInt(result.values.delay as string, 10);
  if (isNaN(delay) || delay < 0) {
    throw new Error("--delay must be a non-negative number");
  }

  const concurrency = parseInt(result.values.concurrency as string, 10);
  if (isNaN(concurrency) || concurrency < 1 || concurrency > 10) {
    throw new Error("--concurrency must be between 1 and 10");
  }

  let maxPages: number | undefined;
  if (result.values["max-pages"]) {
    maxPages = parseInt(result.values["max-pages"] as string, 10);
    if (isNaN(maxPages) || maxPages < 1) {
      throw new Error("--max-pages must be a positive number");
    }
  }

  return {
    values: {
      urls: (result.values.urls as string) || "",
      output: result.values.output as string | undefined,
      delay,
      concurrency,
      maxPages,
      help: result.values.help as boolean,
      version: result.values.version as boolean,
    },
    positionals: result.positionals,
  };
}

/**
 * A page successfully fetched, parsed, and converted
 */
interface ConvertedPage {
  title: string;
  markdown: string;
}

/**
 * Main CLI orchestration.
 * Implements Steps 9.2 and 9.3.
 *
 * @param args Parsed command-line arguments
 * @param stderrWrite Function to write progress messages to stderr (injected for testing)
 * @param fileRead Function to read files (injected for testing)
 * @param fileWrite Function to write files (injected for testing)
 * @returns Exit code (0 = success, 1 = invalid args/empty list, 2 = all pages failed)
 */
export async function run(
  args: CliArgs,
  stderrWrite: (msg: string) => void = (msg) => process.stderr.write(msg),
  fileRead: (path: string) => string = (path) => readFileSync(path, "utf-8"),
  fileWrite: (path: string, content: string) => void = (path, content) =>
    writeFileSync(path, content, "utf-8"),
): Promise<number> {
  try {
    // Step 9.2.1: Read and parse URL list
    if (!args.urls) {
      stderrWrite("Error: --urls <file> is required\n");
      return 1;
    }

    let urlListContent: string;
    try {
      urlListContent = fileRead(args.urls);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stderrWrite(`Error: Failed to read URL list file: ${message}\n`);
      return 1;
    }

    const parseResult = parseUrlList(urlListContent);
    if (!parseResult.ok) {
      const error = parseResult.error;
      stderrWrite(
        `Error: Failed to parse URL list (line ${error.lineNumber}): ${error.message}\n`,
      );
      return 1;
    }

    const { entries, warnings } = parseResult.value;

    // Emit any warnings to stderr
    for (const warning of warnings) {
      stderrWrite(`Warning: ${warning}\n`);
    }

    // Step 9.2.2: Determine root URL and bail if list is empty
    if (entries.length === 0) {
      stderrWrite("Error: URL list is empty\n");
      return 1;
    }

    const firstUrl = entries[0];
    if (!firstUrl) {
      stderrWrite("Error: URL list is empty\n");
      return 1;
    }

    let rootHost: string;
    try {
      const parsed = new URL(firstUrl.url);
      rootHost = parsed.host;
    } catch {
      stderrWrite(`Error: First URL is invalid: ${firstUrl.url}\n`);
      return 1;
    }

    // Step 9.2.3: Apply --max-pages cap; reject cross-host URLs
    let filteredEntries = entries;
    if (args.maxPages && args.maxPages < entries.length) {
      filteredEntries = entries.slice(0, args.maxPages);
    }

    const crossHostUrls: UrlListEntry[] = [];
    const sameHostEntries = filteredEntries.filter((entry) => {
      try {
        const parsed = new URL(entry.url);
        if (parsed.host !== rootHost) {
          crossHostUrls.push(entry);
          return false;
        }
        return true;
      } catch {
        // Invalid URLs: skip them
        return false;
      }
    });

    // Warn about cross-host URLs
    for (const entry of crossHostUrls) {
      stderrWrite(`Warning: Skipping cross-host URL: ${entry.url}\n`);
    }

    if (sameHostEntries.length === 0) {
      stderrWrite("Error: No valid URLs after filtering\n");
      return 2;
    }

    // Step 9.2.4: Initialize RobotsChecker
    const robotsChecker = new RobotsChecker();
    const userAgent = await getUserAgentString();

    // Step 9.2.5: Fetch and convert pages concurrently
    let successCount = 0;
    let errorCount = 0;

    const convertedPages = await runWithConcurrency(
      sameHostEntries,
      async (entry: UrlListEntry): Promise<ConvertedPage | null> => {
        // Check robots.txt
        const allowed = await robotsChecker.isAllowed(entry.url);
        if (!allowed) {
          stderrWrite(`↷ skipped: ${entry.url} (robots.txt)\n`);
          return null;
        }

        // Fetch HTML
        const fetchResult = await fetchHtml(entry.url, {
          timeoutMs: 10000,
          userAgent,
        });

        if (!fetchResult.ok) {
          const error = fetchResult.error;
          let errorMsg = "unknown error";
          if (error.kind === "http") {
            errorMsg = `HTTP ${error.detail}`;
          } else if (error.kind === "timeout") {
            errorMsg = "timeout";
          } else if (error.kind === "network") {
            errorMsg = `network: ${error.detail}`;
          } else if (error.kind === "content_type") {
            errorMsg = `wrong content-type: ${error.detail}`;
          }
          stderrWrite(`✗ failed: ${entry.url} — ${errorMsg}\n`);
          errorCount += 1;
          return null;
        }

        const html = fetchResult.value;

        // Parse HTML
        let doc: Document;
        try {
          doc = parseHtml(html, entry.url);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          stderrWrite(`✗ failed: ${entry.url} — parse error: ${message}\n`);
          errorCount += 1;
          return null;
        }

        // Convert to Markdown
        const convertResult = convertToMarkdown(doc);
        if (!convertResult.ok) {
          const error = convertResult.error;
          stderrWrite(`✗ failed: ${entry.url} — ${error.message}\n`);
          errorCount += 1;
          return null;
        }

        const markdown = convertResult.value;

        // Resolve title
        const title = resolveTitle(entry, doc);

        successCount += 1;
        stderrWrite(`✓ fetched: ${entry.url}\n`);

        return { title, markdown };
      },
      {
        concurrency: args.concurrency,
        perWorkerDelayMs: args.delay,
      },
    );

    // Step 9.2.6: Filter out nulls (preserve order)
    const successfulPages = convertedPages.filter(
      (page): page is ConvertedPage => page !== null,
    );

    // Step 9.2.7: Assemble final document
    const finalMarkdown = assembleDocument(successfulPages);

    // Step 9.2.8: Write output
    try {
      if (args.output) {
        fileWrite(args.output, finalMarkdown);
      } else {
        process.stdout.write(finalMarkdown);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stderrWrite(`Error: Failed to write output: ${message}\n`);
      return 2;
    }

    // Print summary to stderr
    stderrWrite(
      `\n${successCount}/${sameHostEntries.length} pages converted, ${errorCount} errors\n`,
    );

    // Step 9.3: Determine exit code
    if (successCount === 0) {
      return 2; // All pages failed
    }
    return 0; // At least one page succeeded
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderrWrite(`Fatal error: ${message}\n`);
    return 1;
  }
}

/**
 * Prints the help message
 */
export function printHelp(): void {
  const help = `
paperclip-crawl: Convert a URL list into a single concatenated Markdown document

USAGE:
  paperclip-crawl --urls <file> [OPTIONS]

OPTIONS:
  --urls <file>, -u <file>      Path to the URL list file (required, format: see §4.1)
  -o, --output <file>            Write output to file instead of stdout
  --delay <ms>                   Per-worker inter-request delay (default: 500)
  --concurrency <n>              Number of parallel fetch workers (default: 3, max: 10)
  --max-pages <n>                Maximum number of URLs to fetch (optional, no cap by default)
  -h, --help                     Show this help message
  -v, --version                  Show version

EXAMPLES:
  # Fetch all URLs in urls.txt, write to stdout
  paperclip-crawl --urls urls.txt

  # Fetch with custom settings, save to guide.md
  paperclip-crawl --urls urls.txt -o guide.md --delay 1000 --concurrency 5

  # Fetch only the first 10 URLs
  paperclip-crawl --urls urls.txt --max-pages 10 -o guide.md

EXIT CODES:
  0  At least one page was converted
  1  Invalid arguments, file not found, or empty URL list
  2  All pages failed or no pages were attempted

See https://github.com/igoyetche/paperclip for more information.
`;
  console.log(help.trim());
}

/**
 * Prints the version
 */
export async function printVersion(): Promise<void> {
  try {
    const packageJson = await import("../../package.json", {
      assert: { type: "json" },
    });
    const version = (packageJson.default as Record<string, unknown>).version || "0.0.0";
    console.log(`paperclip-crawl v${version}`);
  } catch {
    console.log("paperclip-crawl v0.0.0 (version unknown)");
  }
}
