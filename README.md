# Paperclip

A Chrome extension that converts any web page into a clean Markdown file with a single click. Also includes a CLI for crawling multi-page documentation sites into a single Markdown document.

Paperclip is the companion tool to [Paperboy](https://github.com/your-user/send-to-kindle) — clip a page with Paperclip, then send it to your Kindle with Paperboy.

## Features

### Browser Extension

1. Click the Paperclip extension icon on any page
2. [Readability](https://github.com/mozilla/readability) extracts the article content, stripping nav, ads, and footers
3. [Turndown](https://github.com/mixmark-io/turndown) converts the cleaned HTML to Markdown
4. A `.md` file is automatically downloaded to your configured folder

The filename follows the format `YYYY-MM-DD-article-title.md` (e.g., `2026-04-01-how-to-build-a-chrome-extension.md`).

### Site Crawler CLI

Convert an entire documentation site into a single Markdown document for reading on Kindle:

1. Use the `/site-crawler` Claude Code Skill to discover and order all pages from a docs site — it outputs a `urls.txt` file
2. Run the CLI to fetch every page and assemble them into one document with a navigable table of contents:

```bash
npm run crawl -- --urls urls.txt -o guide.md
```

The output includes a TOC with `[Title](#page-N)` links and each section prefixed with `<a id="page-N"></a>` anchors for Kindle navigation (requires Paperboy PB-025 for full Kindle "Go To" support).

**CLI options:**

| Flag | Default | Description |
|------|---------|-------------|
| `--urls <file>` | — | Path to URL list (required) |
| `-o, --output <file>` | stdout | Output Markdown file |
| `--delay <ms>` | 500 | Delay between requests per worker |
| `--concurrency <n>` | 3 | Parallel fetch workers (max 10) |
| `--max-pages <n>` | — | Cap the number of pages fetched |

The crawler respects `robots.txt` per host and skips cross-domain URLs with a warning.

## Extension Settings

Right-click the extension icon and select **Options** to configure:

- **Include metadata header** — prepends YAML frontmatter (title, URL, date) to the Markdown file (enabled by default)
- **Download folder** — set a custom download path so Paperboy can pick up new files automatically

## Prerequisites

- [Node.js](https://nodejs.org/) v22 or later
- Google Chrome (or any Chromium-based browser)

## Build

```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint
npm run lint

# Build the extension and CLI
npx tsx esbuild.config.ts
```

The build outputs to `dist/`. `dist/extension/` is the folder you load into Chrome; `dist/cli.js` is the standalone crawler.

## Install in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder from this project
5. The Paperclip icon appears in your toolbar — click it on any article page

## Project Structure

```
paperclip/
├── src/
│   ├── domain/                  # Pure functions, no I/O
│   │   ├── errors.ts            # Result<T,E> type and domain errors
│   │   ├── filename-generator.ts
│   │   ├── markdown-converter.ts
│   │   ├── metadata-formatter.ts
│   │   ├── url-list-parser.ts   # Parses urls.txt format
│   │   ├── title-resolver.ts    # Title fallback chain per page
│   │   └── document-assembler.ts # TOC + section concatenation
│   ├── infrastructure/          # I/O adapters
│   │   ├── http-fetcher.ts      # fetch wrapper with timeout/User-Agent
│   │   ├── robots-checker.ts    # Per-host robots.txt cache
│   │   ├── jsdom-adapter.ts     # HTML string → Document
│   │   └── concurrency-runner.ts # Worker pool with per-worker delay
│   ├── application/             # Entry points
│   │   ├── content-script.ts    # Chrome extension content script
│   │   ├── background.ts        # Chrome extension service worker
│   │   └── cli.ts               # Site crawler CLI orchestration
│   ├── cli-entry.ts             # CLI composition root
│   └── shell/                   # Extension manifest and UI
│       ├── manifest.json
│       ├── options.html
│       └── options.ts
├── docs/
│   ├── skills/
│   │   └── site-crawler.md      # Claude Code Skill for URL discovery
│   └── specs/
├── test/
│   ├── domain/
│   ├── infrastructure/
│   ├── application/
│   └── fixtures/
├── esbuild.config.ts
├── tsconfig.json
└── package.json
```

## Tech Stack

- TypeScript (strict)
- Chrome Manifest V3
- Mozilla Readability (content extraction)
- Turndown (HTML to Markdown)
- jsdom (HTML parsing for the CLI)
- robots-parser (robots.txt enforcement)
- esbuild (bundler)
- Vitest (testing)
- ESLint with typescript-eslint (strict type-checked)

## License

MIT
