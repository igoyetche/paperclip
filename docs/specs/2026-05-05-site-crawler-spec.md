# Site Crawler — System Spec

**Date:** 2026-05-05
**Origin:** PB-015 (moved from Paperboy backlog)
**Pipeline:** Skill → Paperclip CLI → Paperboy

## 1. Problem Statement

Multi-page documentation sites (e.g. promptingguide.ai, framework guides, multi-chapter tutorials) are excellent learning material when read on a Kindle, but there is no simple way to turn "a website with N sub-pages" into "a single document on my Kindle." Existing tooling handles only adjacent slices of the problem: Paperclip converts a single page in-browser; Paperboy delivers a Markdown or EPUB file to Kindle. Neither discovers a site's structure, fetches every sub-page, or assembles a coherent single document.

This spec describes a three-component pipeline that fills the gap by reusing existing tools where they fit and adding only the missing pieces.

## 2. Goals and Non-Goals

### Goals

- A user can go from "this docs site URL" to "one Markdown file with the whole site, ordered as the site presents it" in three commands.
- The hard, judgment-heavy work (discovering and ordering sub-pages from arbitrary nav structures) is done by an LLM Skill, not hand-written heuristics.
- The boring, deterministic work (fetching, converting, concatenating, error handling) is done by a CLI that is testable, composable via stdout, and reusable outside the LLM context.
- The existing Paperclip domain layer (`convertToMarkdown`) is reused unchanged. No domain-layer rewrites.
- Paperboy requires no changes.

### Non-Goals

- No fully-automated end-to-end command. Orchestration between the three steps is manual at v1.
- No JavaScript rendering. SPAs that require client-side execution to surface content are out of scope.
- No authenticated, paywalled, or session-protected sites.
- No image downloading or embedding in the CLI. Image URLs remain remote in the output Markdown; Paperboy already downloads and embeds them at EPUB-conversion time.
- No recursive auto-discovery from the CLI. The CLI only fetches what the URL list tells it to.
- No new MCP tool, no Paperboy code changes, no Paperclip extension changes.

## 3. Users and Actors

| Actor | Need | Interaction |
|---|---|---|
| **End user** (single-user personal tool) | Read a multi-page docs site on Kindle | Runs the Skill, then the CLI, then Paperboy |
| **Skill** (Claude Code) | Produce an ordered URL list from a root URL | Reads root page, emits a structured artifact to a file |
| **Paperclip CLI** (new) | Convert a URL list into a single Markdown file | Reads URL list, writes Markdown to stdout or file |
| **Paperboy CLI** (existing, unchanged) | Convert Markdown to EPUB and deliver to Kindle | Reads Markdown file, sends email |
| **Target docs site** | Serve HTML pages | Receives HTTP GET requests, governed by `robots.txt` |

## 4. Functional Requirements

### Skill (URL Discovery)

- **FR-1** The Skill accepts a root URL provided in conversation.
- **FR-2** The Skill first attempts to fetch `sitemap.xml` (and `sitemap_index.xml`) at the root URL's host. If a well-formed sitemap is found, it is used as the URL source. If no usable sitemap is found, the Skill falls back to fetching the root page and identifying sub-pages from its primary content navigation. In both cases the Skill may apply user-requested filtering (e.g. "skip the API reference section") to the resulting list.
- **FR-3** The Skill produces an ordered list of in-domain URLs in the **flat-with-optional-title** format (see §4.1). Order reflects the site's reading order (top-to-bottom in nav).
- **FR-4** The Skill writes the URL list to a file path the user specifies (default: `urls.txt`).
- **FR-5** The Skill supports interactive refinement: if the user says "follow the right sidebar instead" or "skip the API reference section", the Skill regenerates the list.
- **FR-6** The Skill output is the sole input contract for the Paperclip CLI's multi-URL mode. The Skill does not invoke the CLI itself.

### 4.1 URL List Format

The URL list is a UTF-8 plain-text file. Parsing rules:

1. Each non-blank line that does **not** start with `#` is treated as a URL. Whitespace is trimmed.
2. Each line that **starts** with `#` is a comment.
3. If a comment line is **immediately followed** by a URL line (no intervening blank line), the comment's text (everything after the leading `#` and any whitespace) is used as the **title** for that URL.
4. All other comment lines are ignored — including comments separated from the next URL by a blank line, and trailing comments at the end of the file.
5. Blank lines separate groups visually; they have no semantic meaning beyond breaking title-association.

Example:

```
# Prompting Guide — collected pages

# Introduction
https://www.promptingguide.ai/introduction

# Basics
https://www.promptingguide.ai/introduction/basics

https://www.promptingguide.ai/techniques/zeroshot
https://www.promptingguide.ai/techniques/fewshot
```

In this example:
- Line 1 (`# Prompting Guide — collected pages`) is a file-level comment, separated from any URL by a blank line — ignored.
- The first URL gets the title `Introduction`.
- The second gets `Basics`.
- The third and fourth URLs have no preceding title-comment — the CLI derives titles from each page's content.

**Authoring guidance for the Skill:** if the Skill is uncertain about a title, omit the title-comment rather than write a placeholder. The CLI's derivation fallback is reliable; a wrong title-comment overrides it and produces a worse result.

**Title resolution priority in the CLI:** title-comment from URL list → first `<h1>` in the fetched page → page `<title>` → URL path slug.

### Paperclip CLI

- **FR-7** The CLI accepts a URL-list file via `--urls <file>` (format defined in §4.1) and produces a single concatenated Markdown document covering all URLs in the file's order. A URL-list file with a single URL is a valid input.
- **FR-8** _(reserved — was single-URL positional mode; removed 2026-05-05, see §8.4)_
- **FR-9** The concatenated output begins with a generated table of contents. Each TOC entry is a Markdown link of the form `[Title](#page-N)` where `N` is the 1-indexed position of the page in the URL list.
- **FR-10** Each page in the concatenated output is preceded by, in order: a horizontal-rule separator from the previous page, an `<a id="page-N"></a>` anchor on its own line, and the page title as an H1.
- **FR-11** A `-o <file>` flag writes output to a file instead of stdout.
- **FR-12** A `--delay <ms>` flag controls per-worker inter-request delay (default: 500ms).
- **FR-12a** A `--concurrency <n>` flag controls the number of parallel fetch workers (default: 3, max: 10).
- **FR-13** A `--max-pages <n>` flag caps the number of URLs fetched.
- **FR-14** Progress messages are written to stderr. Errors on individual pages are logged to stderr and do not abort the run; the failing page is omitted from the output and noted in stderr.
- **FR-15** Duplicate URLs in the input list are detected and skipped.
- **FR-16** The CLI respects `robots.txt` for the root domain; URLs disallowed by `robots.txt` are skipped with a stderr log.
- **FR-17** The CLI reuses Paperclip's existing `convertToMarkdown(doc: Document)` function from `src/domain/markdown-converter.ts` without modification. HTML is fetched via `fetch` and parsed via `jsdom`.

### Paperboy

- **FR-18** No changes. The user runs `paperboy --title "..." --file guide.md` against the CLI's output exactly as today.

## 5. Non-Functional Requirements

- **NFR-1 (Architectural integrity)** The Paperclip CLI must reuse the existing domain layer (`convertToMarkdown`, `formatMetadata`, `generateFilename`) without modification. New code lives only in `src/application/cli.ts` and a new entry point.
- **NFR-2 (Performance)** Per-page conversion (fetch + parse + Markdown) completes in under 3 seconds on a typical server-rendered docs page over a normal connection.
- **NFR-3 (Politeness)** Default per-worker inter-request delay is 500ms; default concurrency is 3 workers. The CLI must never exceed `--concurrency` simultaneous in-flight requests to the target host. Effective request rate ≈ `concurrency / delay` (≈6 req/s at defaults).
- **NFR-4 (Safety)** The CLI fetches only URLs whose host matches the root URL's host. Cross-domain URLs in the input list are skipped with a stderr log. (This is a defense-in-depth check; the Skill should not produce cross-domain URLs.)
- **NFR-5 (Observability)** Progress includes per-URL status (`✓ fetched`, `✗ failed`, `↷ skipped`) on stderr. Final summary line reports `N/M pages converted, X errors`.
- **NFR-6 (Determinism)** Given the same URL list, the CLI produces byte-identical output (modulo timestamp metadata) on every run.
- **NFR-7 (Dependency footprint)** New runtime dependencies are limited to `jsdom` (already in devDeps — promote to dependencies). No headless browser, no extra HTTP client beyond native `fetch`.
- **NFR-8 (Build)** The CLI ships as part of Paperclip's existing build (esbuild). Add a new entry point; do not introduce a separate package.

## 6. Constraints

- **C-1** Must reuse Paperclip's existing domain layer unchanged.
- **C-2** Must run on Node ≥22 (matches existing Paperclip `engines`).
- **C-3** Must work without a headless browser — `jsdom` only at v1.
- **C-4** Must not require a Chrome browser installation, must not depend on the extension build.
- **C-5** The Skill must be invokable from Claude Code with no external API key configuration (it uses the user's existing Claude Code session).
- **C-6** Output Markdown must be a valid input to Paperboy's existing Markdown→EPUB pipeline (no surprises like custom syntax).

## 7. Key Scenarios

### Scenario 1: Happy path — full docs site to Kindle

1. User asks the Skill to crawl `https://www.promptingguide.ai/`.
2. Skill fetches the root page, identifies the sidebar navigation, emits an ordered list of ~50 in-domain URLs to `urls.txt`.
3. User runs `paperclip --urls urls.txt -o guide.md`.
4. CLI fetches each URL with a 500ms delay, converts each via the existing domain function, concatenates with TOC and separators, writes `guide.md`.
5. User runs `paperboy --title "Prompting Guide" --file guide.md`.
6. EPUB arrives on Kindle with a navigable TOC.

### Scenario 2: Per-page failure mid-crawl

1. Skill produces a 30-URL list.
2. CLI starts fetching. Page 17 returns HTTP 500.
3. CLI logs `✗ failed: <url> — 500 Internal Server Error` to stderr, skips it, continues.
4. Final stderr summary: `29/30 pages converted, 1 error`.
5. Output Markdown contains 29 sections; the failed page is listed in the stderr log but absent from the TOC.

### Scenario 3: Interactive Skill refinement

1. User asks Skill to crawl a docs site.
2. Skill produces a list including the API reference section.
3. User says "skip the API reference, I just want the tutorial."
4. Skill regenerates the list excluding API-reference URLs.
5. User proceeds with the CLI using the refined list.

### Scenario 4: robots.txt enforcement

1. Skill produces a list including a URL under `/internal/`.
2. The site's `robots.txt` disallows `/internal/`.
3. CLI logs `↷ skipped: <url> — disallowed by robots.txt` and omits the page.

## 8. Open Questions

1. ~~**URL list format.**~~ **Resolved 2026-05-05:** flat plain-text file with optional title comments (see §4.1). Decision rationale: hand-editability and `grep`/`sort`/version-control composability outweigh the convenience of structured metadata. Title comments give 80% of JSON's benefit without the parse-error or title-conflict surface area. JSON remains a clean upgrade path if richer metadata is ever needed.

2. ~~**Skill location.**~~ **Resolved 2026-05-05:** lives in Paperclip's repo at `.claude/skills/site-crawler/SKILL.md` (Claude Code convention) for now. Decision rationale: keeps the Skill versioned alongside the CLI it produces input for; can be promoted to a user-level or shared-skills location later if reuse demand emerges.

3. ~~**Page ordering source of truth.**~~ **Resolved 2026-05-05** (implicitly by §8.1 + §8.4): the URL-list file is the sole source of truth. The Skill produces an initial ordered guess; the user may hand-edit to reorder. The CLI follows file order with no re-sorting.

4. ~~**Single-URL mode vs multi-URL only.**~~ **Resolved 2026-05-05:** multi-URL only. The CLI's only input is a URL-list file (§4.1); a single-URL file is a valid use case. Decision rationale: keeps the surface area small and the contract uniform. Single-page conversion remains the Chrome extension's job. If a positional `paperclip <url>` shorthand becomes desirable later, it's a non-breaking addition.

5. ~~**Concurrency.**~~ **Resolved 2026-05-05:** limited parallelism. Default `--concurrency 3` (configurable). `--delay` becomes the inter-request throttle applied per-worker (so 3 workers with a 500ms delay produce ~6 requests/sec to the host, not 3). Decision rationale: sequential is too slow for 50-page sites; unlimited concurrency is impolite. Three workers is a defensible middle ground for a single-host docs site crawl.

6. ~~**TOC anchor strategy.**~~ **Resolved 2026-05-05:** explicit `<a id="page-N"></a>` markers with sequential IDs. Each section is preceded by `<a id="page-N"></a>` immediately before its `# Title` heading. The TOC at the top of the document links via `[Title](#page-N)`. Decision rationale: deterministic, collision-free, renderer-agnostic, robust to duplicate or unusual titles. **Dependency:** Paperboy's `sanitize-html` config currently allows only `href` and `title` on `<a>` tags (`src/infrastructure/converter/markdown-epub-converter.ts:57`); `id` is stripped. Tracked as **paperboy/PB-025 (EPUB Navigation Support)** — must ship before this spec's TOC behavior produces working Kindle links.

7. ~~**`sitemap.xml` shortcut in the Skill.**~~ **Resolved 2026-05-05:** the Skill checks for `sitemap.xml` (and `sitemap_index.xml`) at the root URL's host first. If present and well-formed, the Skill uses it as the URL source — preserving any LLM-driven filtering (e.g. "skip the API reference") but skipping nav-structure inference. Falls back to LLM-driven nav discovery on the root page if no usable sitemap is found.

## 9. Success Criteria

- **SC-1** End-to-end test: crawl promptingguide.ai, deliver to Kindle, verify the EPUB opens with a working TOC and all expected sections.
- **SC-2** Re-running the CLI with the same `urls.txt` produces byte-identical output (modulo any embedded timestamp).
- **SC-3** A page failing mid-crawl does not abort the run; the final document contains the surviving pages.
- **SC-4** The Paperclip CLI's automated tests cover: single-URL conversion, multi-URL concatenation, per-page error handling, robots.txt enforcement, duplicate-URL handling.
- **SC-5** Existing Paperclip extension tests still pass with no modifications to the domain layer.

## 10. Context and References

- **Origin feature**: `paperboy/docs/features/backlog/PB-015-site-crawler.md` (this spec supersedes the original "standalone `papercrawl` tool" framing)
- **Paperclip codebase**: `C:\projects\experiments\paperclip\` — existing Chrome extension
- **Paperclip design spec**: `paperclip/docs/specs/2026-03-31-paperclip-design.md` — three-layer architecture this spec extends
- **Paperboy CLI**: `C:\projects\experiments\paperboy\src\application\cli.ts` — downstream consumer of the CLI's output
- **Domain function reused**: `paperclip/src/domain/markdown-converter.ts` — `convertToMarkdown(doc: Document)`
- **Decision log**: original PB-015 backlog entry retired in favor of this spec; Paperboy's STATUS.md to note the move
