# Site Crawler Implementation Plan

**Status:** Backlog
**Created:** 2026-05-05
**Last updated:** 2026-05-05
**Spec:** [`2026-05-05-site-crawler-spec.md`](./2026-05-05-site-crawler-spec.md)
**Cross-repo dependency:** `paperboy/PB-025` (EPUB Navigation Support) — required for end-to-end Kindle navigation

### Progress

| Phase | Tasks | Status |
|-------|-------|--------|
| 1 — Foundation | 1 | ⬜ Not started |
| 2 — Pure domain helpers | 2, 3, 4 | ⬜ Not started |
| 3 — Infrastructure | 5, 6, 7, 8 | ⬜ Not started |
| 4 — Application orchestration | 9 | ⬜ Not started |
| 5 — Skill | 10 | ⬜ Not started |
| 6 — Validation | 11 | ⬜ Not started |

**Task status legend** (set on each task heading and propagate to the table):
`⬜ Not started` · `🔄 In progress` · `✅ Done (YYYY-MM-DD)` · `⏸ Blocked: <reason>` · `🚫 Dropped: <reason>`

**Step status legend** (per `- [ ]` checkbox):
`[ ]` Todo · `[~]` In progress · `[x]` Done (YYYY-MM-DD) · `[-]` Dropped (reason) · `[!]` Blocked (reason)

When transitioning the plan itself: update **Status** at the top to `Active` when the first task starts, and `Done` when Task 11 completes. Update **Last updated** on every status change.

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Site Crawler pipeline defined in `2026-05-05-site-crawler-spec.md` — a Claude Code Skill that produces an ordered URL list, plus a Paperclip CLI that fetches each URL and emits a single concatenated Markdown document with a navigable TOC.

**Architecture:** Extends Paperclip's existing three-layer design without modifying the domain layer. The CLI is a new application entry point alongside `content-script.ts` and `background.ts`; it reuses `convertToMarkdown` from `src/domain/markdown-converter.ts` unchanged. The Skill lives at `.claude/skills/site-crawler/SKILL.md` (Claude Code convention).

**Tech Stack additions:**
- `jsdom` — promoted from devDependencies to dependencies (HTML parsing for the CLI)
- `robots-parser` — robots.txt enforcement (NFR-4)
- Node 22's built-in `util.parseArgs` — argument parsing, no new dep

**Existing code reused unchanged:**
- `src/domain/markdown-converter.ts` (`convertToMarkdown`) — core HTML→Markdown
- `src/domain/errors.ts` (Result type, error classes) — extended with new error variants if needed
- `src/domain/metadata-formatter.ts` — optionally used per-page

**Cross-repo dependency:** `paperboy/PB-025 (EPUB Navigation Support)` — the `<a id="page-N">` anchors emitted by the CLI are stripped by Paperboy's current `sanitize-html` config. The CLI can ship and produce correct Markdown independently; end-to-end Kindle navigation requires PB-025 to land in Paperboy. Track in parallel.

---

## File Map

| File | Type | Responsibility |
|------|------|----------------|
| `package.json` | modify | Promote jsdom to deps; add robots-parser; add `crawl` script and optional `bin` entry |
| `esbuild.config.ts` | modify | Add a Node-target CLI bundle alongside extension bundles |
| `src/domain/url-list-parser.ts` | new | Parse §4.1 flat-with-optional-title format |
| `src/domain/title-resolver.ts` | new | Resolution chain: title-comment → `<h1>` → `<title>` → URL slug |
| `src/domain/document-assembler.ts` | new | TOC + per-page section concatenation with `<a id="page-N">` anchors |
| `src/domain/errors.ts` | modify | Add `FetchError`, `RobotsBlockedError`, `UrlListParseError` if needed |
| `src/infrastructure/http-fetcher.ts` | new | `fetch` wrapper with timeout, User-Agent |
| `src/infrastructure/robots-checker.ts` | new | Per-host robots.txt fetch + cache + URL allow check |
| `src/infrastructure/jsdom-adapter.ts` | new | HTML string → `Document` |
| `src/infrastructure/concurrency-runner.ts` | new | Worker-pool with per-worker inter-request delay |
| `src/application/cli.ts` | new | Argument parsing, orchestration, progress reporting, exit codes |
| `src/cli-entry.ts` | new | Composition root for the CLI |
| `.claude/skills/site-crawler/SKILL.md` | new | Skill instructions (sitemap-first, nav-fallback, §4.1 output) |
| `test/domain/url-list-parser.test.ts` | new | Format compliance, edge cases |
| `test/domain/title-resolver.test.ts` | new | Each fallback level |
| `test/domain/document-assembler.test.ts` | new | TOC + section structure |
| `test/infrastructure/http-fetcher.test.ts` | new | Timeout, User-Agent, error mapping |
| `test/infrastructure/robots-checker.test.ts` | new | Allow/disallow rules with fixture robots.txt |
| `test/infrastructure/concurrency-runner.test.ts` | new | Worker count, delay enforcement |
| `test/application/cli.test.ts` | new | Arg parsing, exit codes, dispatch |
| `test/fixtures/robots/*.txt` | new | Sample robots.txt files |
| `test/fixtures/sample-pages/*.html` | new | Sample HTML for end-to-end |

---

## Phase 1 — Foundation

### Task 1: Add CLI dependencies and build target ⬜

**Files:** `package.json`, `esbuild.config.ts`

- [ ] **Step 1.1** Promote `jsdom` from `devDependencies` to `dependencies` in `package.json`.
- [ ] **Step 1.2** Add `robots-parser` (latest stable) to `dependencies`.
- [ ] **Step 1.3** Add an npm script: `"crawl": "tsx src/cli-entry.ts"` for development use. Defer adding a `bin` entry until validation passes (Phase 6).
- [ ] **Step 1.4** Extend `esbuild.config.ts` to produce a Node-target CLI bundle from `src/cli-entry.ts` to `dist/cli.js`. Existing extension bundles must continue to build unchanged; verify by running the existing build and confirming the extension `.js` outputs are identical.
- [ ] **Step 1.5** Run `npm install` and `npm run build`; both must succeed.
- [ ] **Step 1.6** Run `npm test`; all existing tests must continue to pass.

**Verification:** `dist/cli.js` exists, extension bundles unchanged, all existing tests green.

---

## Phase 2 — Pure domain helpers (no I/O)

### Task 2: URL list parser ⬜

**Files:** `src/domain/url-list-parser.ts`, `test/domain/url-list-parser.test.ts`

Implements the parser for §4.1 of the spec.

- [ ] **Step 2.1** Define `interface UrlListEntry { readonly url: string; readonly title?: string; }`.
- [ ] **Step 2.2** Implement `parseUrlList(content: string): Result<UrlListEntry[], UrlListParseError>`:
  - Split on `\n` (handle CRLF too)
  - Walk lines; track an "active comment" only when the previous non-blank line was a comment with **no intervening blank line**
  - Validate URLs with `new URL(...)`; on invalid URL, return error with line number
  - Skip duplicate URLs (NFR-4 / FR-15) and emit a warning to a passed-in logger or accumulator (decide on a small return-shape: `{ entries, warnings }` may be cleaner than a flat list)
- [ ] **Step 2.3** Tests covering:
  - Blank file → empty list
  - Pure URLs, no comments
  - URL with title-comment immediately above
  - URL with title-comment separated by blank line (comment ignored)
  - Trailing comment with no following URL (ignored)
  - Multiple comments stacked above a URL — pick **the immediately-preceding** one
  - Whitespace handling (leading/trailing on URL, on title text)
  - Invalid URL → parse error with line number
  - Duplicate URLs → kept once, warning recorded
  - CRLF line endings

**Verification:** All tests pass. No I/O, no DOM.

### Task 3: Title resolver ⬜

**Files:** `src/domain/title-resolver.ts`, `test/domain/title-resolver.test.ts`

Implements the priority chain in §4.1: title-comment → first `<h1>` → page `<title>` → URL slug.

- [ ] **Step 3.1** Implement `resolveTitle(entry: UrlListEntry, doc: Document): string`. The function must always return a non-empty string.
- [ ] **Step 3.2** URL-slug fallback: take the last non-empty path segment, decode percent-encoding, replace `-`/`_` with spaces, title-case. If the URL has no path (root), use the host.
- [ ] **Step 3.3** Tests covering each fallback level independently:
  - Title-comment provided → returned verbatim
  - No title-comment, `<h1>` present → returned
  - No title-comment, no `<h1>`, `<title>` present → returned (trim trailing " - SiteName" suffix? **No** — leave as-is; the suffix-stripping heuristic is brittle and out of scope)
  - None of the above → URL slug fallback
  - Root URL with no `<h1>`, no `<title>` → host name

**Verification:** Tests pass. Pure function, takes `Document` (jsdom or browser), returns string.

### Task 4: Document assembler ⬜

**Files:** `src/domain/document-assembler.ts`, `test/domain/document-assembler.test.ts`

Generates the final concatenated Markdown per FR-9 / FR-10.

- [ ] **Step 4.1** Define `interface AssembledPage { readonly title: string; readonly markdown: string; }`. The `markdown` is the output of the existing `convertToMarkdown` for a single page.
- [ ] **Step 4.2** Implement `assembleDocument(pages: AssembledPage[]): string`:
  - Emit `## Table of Contents\n\n` followed by one `- [Title](#page-N)` line per page (1-indexed)
  - Emit a blank line
  - For each page: emit `\n---\n\n<a id="page-N"></a>\n\n# {title}\n\n{markdown}\n`
  - Strip any leading H1 from `markdown` if it matches the page title (avoid double H1)
- [ ] **Step 4.3** Tests covering:
  - Empty input → empty output (or just a header? decide — empty output is simpler)
  - Single page → TOC has one entry, one section
  - Multi-page (3+) → all entries, all sections, correct anchor numbering
  - Title with Markdown special characters (`[`, `]`, `(`, `)`) — must not break the TOC link syntax (escape or pass through unmodified per CommonMark — pick one and document)
  - Page markdown with leading H1 matching title → stripped
  - Page markdown with leading H1 *not* matching title → preserved

**Verification:** Tests pass.

---

## Phase 3 — Infrastructure (I/O)

### Task 5: HTTP fetcher ⬜

**Files:** `src/infrastructure/http-fetcher.ts`, `test/infrastructure/http-fetcher.test.ts`

- [ ] **Step 5.1** Implement `fetchHtml(url: string, options: { timeoutMs: number; userAgent: string }): Promise<Result<string, FetchError>>`. Use Node's native `fetch` with `AbortController` for the timeout.
- [ ] **Step 5.2** Set User-Agent to `paperclip-crawler/{version} (+https://github.com/...)` (use a constant — version pulled from `package.json`).
- [ ] **Step 5.3** Map errors: HTTP non-2xx → `FetchError("http", status)`; network error → `FetchError("network", message)`; timeout → `FetchError("timeout")`; non-HTML content-type → `FetchError("content_type", contentType)`.
- [ ] **Step 5.4** Tests using vitest's `vi.stubGlobal('fetch', ...)`: success path, 404, 500, network error, timeout, non-HTML content-type.

**Verification:** Tests pass.

### Task 6: robots.txt checker ⬜

**Files:** `src/infrastructure/robots-checker.ts`, `test/infrastructure/robots-checker.test.ts`, `test/fixtures/robots/*.txt`

- [ ] **Step 6.1** Implement a class `RobotsChecker` with method `isAllowed(url: string): Promise<boolean>`. Internally caches one `robots-parser` instance per host (Map keyed by host).
- [ ] **Step 6.2** First call for a host fetches `https://{host}/robots.txt`. On 404 or any fetch error, treat as fully-permissive (cache an "always allow" stub).
- [ ] **Step 6.3** Use the same User-Agent as the main fetcher when checking rules.
- [ ] **Step 6.4** Tests with fixture robots.txt:
  - Empty robots.txt → all allowed
  - `Disallow: /private/` → `/private/foo` blocked, `/public/foo` allowed
  - `User-agent: *` rules respected
  - Fetch-failure for robots.txt → permissive fallback
  - Repeated calls for same host → robots.txt fetched only once

**Verification:** Tests pass.

### Task 7: jsdom adapter ⬜

**Files:** `src/infrastructure/jsdom-adapter.ts` (small — possibly inlined into the CLI)

- [ ] **Step 7.1** Implement `parseHtml(html: string, baseUrl: string): Document` — wrap `new JSDOM(html, { url: baseUrl }).window.document`. Setting `url` matters for relative-link resolution inside Readability.
- [ ] **Step 7.2** No tests needed (trivial wrapper); covered indirectly by integration tests.

**Verification:** Compiles, used downstream.

### Task 8: Concurrency runner ⬜

**Files:** `src/infrastructure/concurrency-runner.ts`, `test/infrastructure/concurrency-runner.test.ts`

- [ ] **Step 8.1** Implement `runWithConcurrency<T, R>(items: T[], fn: (item: T) => Promise<R>, options: { concurrency: number; perWorkerDelayMs: number; onProgress?: (done: number, total: number) => void }): Promise<R[]>`. Output preserves input order.
- [ ] **Step 8.2** Each worker waits `perWorkerDelayMs` between its own consecutive calls (not before its first call).
- [ ] **Step 8.3** Tests with mock async functions:
  - Concurrency=1 → fully sequential
  - Concurrency=N → at most N in-flight at any time (track via counter)
  - Per-worker delay enforced (verify with a fake timer)
  - Output order matches input order even when call durations vary
  - Progress callback invoked exactly `items.length` times

**Verification:** Tests pass.

---

## Phase 4 — Application orchestration

### Task 9: CLI entry point ⬜

**Files:** `src/application/cli.ts`, `src/cli-entry.ts`, `test/application/cli.test.ts`

- [ ] **Step 9.1** Implement `parseArgs(argv: string[])` using `node:util`'s `parseArgs`:
  - `--urls <file>` (required)
  - `-o, --output <file>` (optional; default stdout)
  - `--delay <ms>` (default 500)
  - `--concurrency <n>` (default 3, max 10)
  - `--max-pages <n>` (optional; no cap)
  - `--help`, `--version`
- [ ] **Step 9.2** Implement orchestration in `run(args)`:
  1. Read URL list file, parse via Task 2
  2. Determine root URL (host of the first entry; bail if list is empty)
  3. Apply `--max-pages` cap; reject cross-host URLs (NFR-4) with stderr warning + skip
  4. Initialize `RobotsChecker` for the root host
  5. Invoke `runWithConcurrency` over entries; per-entry function:
     a. Check robots → skip if disallowed (stderr `↷ skipped`)
     b. Fetch HTML → on error, log `✗ failed` and return null
     c. `parseHtml` + `convertToMarkdown` (existing domain function) — on conversion error, log `✗ failed`, return null
     d. `resolveTitle` against the parsed document
     e. Return `{ title, markdown }` or null
  6. Filter out nulls preserving order; pass surviving pages to `assembleDocument`
  7. Write to stdout or `-o` file
  8. Print summary to stderr: `N/M pages converted, X errors`
- [ ] **Step 9.3** Exit codes: 0 = at least one page converted; 1 = invalid args / file not found / empty list; 2 = all pages failed.
- [ ] **Step 9.4** `cli-entry.ts` is the composition root: read `argv`, call `run`, set process exit code, no other logic.
- [ ] **Step 9.5** Tests for `parseArgs` (valid, invalid, defaults), and a smoke test for `run` with all I/O dependencies stubbed.

**Verification:** `npm run crawl -- --help` works; `npm run crawl -- --urls test/fixtures/urls.txt` against fixture HTML produces expected output (use a local fixture server or stubbed fetch).

---

## Phase 5 — Skill

### Task 10: Author the site-crawler Skill ⬜

**File:** `.claude/skills/site-crawler/SKILL.md`

The Skill is purely instructional content — no code. It tells Claude how to behave when invoked.

- [ ] **Step 10.1** Write SKILL.md frontmatter (name, description, when to use).
- [ ] **Step 10.2** Document the procedure:
  1. Take a root URL from the user
  2. Attempt to fetch `{host}/sitemap.xml` (and `sitemap_index.xml`); if found and well-formed, extract URLs filtered to the same host
  3. If no usable sitemap, fetch the root page; identify the primary content navigation; extract in-domain sub-page URLs in reading order
  4. Apply any user-provided filters ("skip API reference", etc.)
  5. Write output to `urls.txt` (or path specified by user) in the §4.1 format
  6. Echo a summary count to the user
- [ ] **Step 10.3** Document interactive refinement: if the user says "drop X" or "follow the right sidebar instead", regenerate the file.
- [ ] **Step 10.4** Include 1-2 concrete examples (input URL → expected output snippet) and explicit "**don't include placeholder titles**" guidance per the §4.1 authoring rule.
- [ ] **Step 10.5** Document the manual handoff: the Skill **does not** invoke the CLI; the user runs `npm run crawl -- --urls urls.txt -o guide.md` (or the eventual `paperclip-crawl` binary) themselves.

**Verification:** Skill loads in Claude Code; running it on a real docs site produces a valid `urls.txt` that the CLI can consume without parse errors.

---

## Phase 6 — End-to-end validation

### Task 11: Real-site smoke test ⬜

- [ ] **Step 11.1** Run the Skill against `https://www.promptingguide.ai/` — verify `urls.txt` looks sensible and respects nav order.
- [ ] **Step 11.2** Run the CLI: `npm run crawl -- --urls urls.txt -o guide.md`. Verify completion, summary, and that `guide.md` opens cleanly.
- [ ] **Step 11.3** Manual inspection of `guide.md`: TOC at top, all `[Title](#page-N)` links present, each section has the `<a id="page-N"></a>` marker, separators in place.
- [ ] **Step 11.4** **Cross-repo verification (depends on PB-025):** run `paperboy --title "Prompting Guide" --file guide.md --device personal`; verify on Kindle that the "Go To" menu lists each section and TOC links jump correctly. **If PB-025 is not yet shipped, document the result and defer this step.**

**Verification:** End-to-end Kindle navigation works; or, if PB-025 is pending, the produced Markdown is verified correct and the integration is queued.

---

## Notes for the implementer

- **No domain layer changes.** The existing `convertToMarkdown` is reused as-is. If you find yourself wanting to modify it, stop and reconsider — the contract is HTML `Document` in, Markdown `string` out, and that's all the CLI needs.
- **`parseUrlList` complexity is real.** The "comment immediately preceding URL = title" rule is the trickiest piece in the whole plan. Test it exhaustively before moving on; bugs here cascade everywhere downstream.
- **`sanitize-html` strips `<a id>` in Paperboy today.** Your CLI output is correct per the spec; don't add workarounds. The fix lives in PB-025.
- **Don't over-engineer error types.** `Result<T, FetchError | RobotsBlockedError | ConversionError | UrlListParseError>` is enough. No abstract base classes, no error hierarchies.
- **Keep the CLI bundle small.** Don't pull in extension-only code paths from `application/`. If sharing tempts you, the shared piece probably belongs in `domain/`.
