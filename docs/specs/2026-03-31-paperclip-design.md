# Paperclip — Chrome Extension Design

## Overview

A Chrome extension (Manifest V3) that converts the current web page into a clean Markdown file and downloads it automatically. Companion tool to [Paperboy](C:\projects\experiments\send-to-kindle) — clip a page with Paperclip, send it to Kindle with Paperboy.

## Core Workflow

1. User clicks the Paperclip extension icon
2. Content script extracts article content using Mozilla Readability
3. Cleaned HTML is converted to Markdown via Turndown
4. Metadata header (title, URL, date) is prepended if enabled
5. Filename is generated as `YYYY-MM-DD-sanitized-title.md`
6. File is downloaded to the configured folder via `chrome.downloads`

## Architecture

Three layers matching Paperboy conventions:

```
Shell (manifest, service worker, options page)
  └─ Application (content script orchestration, download triggering)
      └─ Domain (content extraction, markdown conversion, filename generation)
```

- **Domain** — pure functions, no browser APIs. Result types for error handling. Fully testable.
- **Application** — content script orchestrates domain logic on the page DOM. Service worker triggers downloads.
- **Shell** — manifest.json, options page, wiring.

## Components

### Content Script (`content-script.ts`)

Injected into the active tab on icon click. Orchestrates:

1. Run Readability on the page DOM to extract article HTML
2. Pass cleaned HTML to Markdown Converter
3. Prepend metadata header if enabled
4. Generate filename
5. Send `{markdown, filename}` message to service worker

Returns `Result<MarkdownDocument, ExtractionError>`.

### Service Worker (`background.ts`)

- Listens for extension icon click → executes content script in active tab
- Receives `{markdown, filename}` from content script
- Triggers `chrome.downloads.download()` with configured folder path
- Shows `chrome.notifications` on error

### Markdown Converter (`markdown-converter.ts`)

Pure domain function. Takes clean HTML from Readability, converts via Turndown.

Preserves: headings, lists, links, images, code blocks, tables.

### Filename Generator (`filename-generator.ts`)

Pure function. Takes page title + current date, returns `YYYY-MM-DD-sanitized-title.md`.

Sanitization: lowercase, replace spaces with hyphens, strip special characters, truncate if too long.

### Metadata Formatter (`metadata-formatter.ts`)

Pure function. Generates a Markdown header block:

```markdown
---
title: Page Title
url: https://example.com/article
date: 2026-03-31
---
```

### Options Page (`options.html` + `options.ts`)

Minimal settings UI. Stored in `chrome.storage.sync`:

- **Include metadata header** — boolean, default: `true`
- **Download folder path** — string, default: browser default download folder

## Error Handling

Result types matching Paperboy's pattern — `Result<T, E>` discriminated unions, no thrown exceptions in domain code.

Error types:
- `ExtractionError` — Readability couldn't parse the page (no article content found)
- `ConversionError` — Turndown failed to convert

On error: service worker shows a `chrome.notifications` message to the user.

## Testing

- **Framework:** Vitest, matching Paperboy conventions
- **Domain tests:** markdown converter, filename generator, metadata formatter — all pure functions tested with HTML fixture files
- **Fixtures:** sample HTML pages (articles, blog posts, docs) with expected Markdown output
- **No Chrome API tests** — domain is pure, shell is thin wiring
- **Convention:** `test/` mirrors `src/`, global `describe`/`it`/`expect`

## Project Structure

```
paperclip/
├── src/
│   ├── domain/
│   │   ├── errors.ts
│   │   ├── markdown-converter.ts
│   │   ├── filename-generator.ts
│   │   └── metadata-formatter.ts
│   ├── application/
│   │   ├── content-script.ts
│   │   └── background.ts
│   └── shell/
│       ├── manifest.json
│       ├── options.html
│       └── options.ts
├── test/
│   ├── domain/
│   │   ├── markdown-converter.test.ts
│   │   ├── filename-generator.test.ts
│   │   └── metadata-formatter.test.ts
│   └── fixtures/
│       └── sample-article.html
├── tsconfig.json
├── eslint.config.mjs
├── vitest.config.ts
├── esbuild.config.ts
└── package.json
```

## Tech Stack

- TypeScript (strict, matching Paperboy's tsconfig)
- esbuild (bundler for Chrome extension)
- Vitest (testing)
- ESLint with typescript-eslint (strict type-checked)
- Dependencies: `@mozilla/readability`, `turndown`

## Future Integration

- Could pipe directly to Paperboy CLI or MCP instead of downloading
- Cross-browser support via webextension-polyfill if needed later
