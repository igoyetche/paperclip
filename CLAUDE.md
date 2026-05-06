# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run build        # Bundle extension (dist/) and CLI (dist/cli.js) via esbuild
npm test             # Run all tests (vitest)
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint (strict typescript-eslint)
npm run lint:fix     # Auto-fix lint errors

# Run a single test file
npx vitest run test/domain/url-list-parser.test.ts

# Run the site-crawler CLI in dev mode
npm run crawl -- --urls urls.txt -o guide.md
```

## Architecture

Paperclip has two independent entry points that share the same domain layer:

### 1. Chrome Extension
- `src/application/content-script.ts` — injected into the page; calls `convertToMarkdown`, sends result to background
- `src/application/background.ts` — service worker; receives the message and triggers `chrome.downloads`
- `src/shell/` — manifest, options page

### 2. Site Crawler CLI
- `src/cli-entry.ts` — composition root; reads `argv`, calls `run()`, sets exit code
- `src/application/cli.ts` — orchestrates the full pipeline: parse URL list → robots check → concurrent fetch → convert → assemble → write output

### Three-Layer Design

```
domain/         Pure functions, no I/O, no browser/Node APIs
infrastructure/ I/O adapters (fetch, jsdom, robots-parser)
application/    Entry points that wire domain + infrastructure together
```

**Constraint:** The domain layer must never be modified to accommodate either entry point. If you feel the need to change a domain function, the change almost certainly belongs in the caller instead.

### Domain Layer Key Pieces

- **`errors.ts`** — defines `Result<T, E>` (`ok` / `err` constructors) used everywhere; never throw across layer boundaries
- **`markdown-converter.ts`** — `convertToMarkdown(doc: Document): Result<string, ExtractionError>` — the core HTML→Markdown function used by both entry points
- **`url-list-parser.ts`** — parses the `§4.1` URL list format (one URL per line, optional `# Title` comment immediately above a URL becomes its title; blank line between comment and URL means the comment is ignored)
- **`title-resolver.ts`** — priority chain: title-comment → `<h1>` → `<title>` → URL slug
- **`document-assembler.ts`** — generates TOC + per-page sections with `<a id="page-N"></a>` anchors

### Infrastructure Layer

- **`http-fetcher.ts`** — native `fetch` with timeout, User-Agent, and error categorisation (`http` / `network` / `timeout` / `content_type`)
- **`robots-checker.ts`** — `RobotsChecker` class; caches one `robots-parser` instance per host, treats fetch failures as permissive
- **`concurrency-runner.ts`** — `runWithConcurrency` worker pool; preserves output order, applies per-worker delay between consecutive requests

### Build

`esbuild.config.ts` produces two independent bundles:
- Extension bundle: three entry points (`content-script`, `background`, `options`) targeting Chrome 120 ESM
- CLI bundle: `cli-entry.ts` targeting Node 22 ESM; `jsdom`, `robots-parser`, and Node built-ins are marked external (not bundled)

## Cross-Repo Dependency

`<a id="page-N"></a>` anchors emitted by `document-assembler.ts` are currently stripped by Paperboy's `sanitize-html` config. The CLI output is correct; full Kindle "Go To" navigation requires **Paperboy PB-025** to land. Do not add workarounds in this repo.

## URL List Format (§4.1)

```
# Title comment (optional)
https://example.com/page-1

https://example.com/page-2   ← no comment, CLI derives title from page content
```

A comment only attaches to the URL immediately below it — no blank line between them. The `/site-crawler` skill (`.claude/skills/site-crawler/SKILL.md`, authoritative copy at `docs/skills/site-crawler.md`) produces this format automatically.
