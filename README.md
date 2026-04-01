# Paperclip

A Chrome extension that converts any web page into a clean Markdown file with a single click.

Paperclip is the companion tool to [Paperboy](https://github.com/your-user/send-to-kindle) — clip a page with Paperclip, then send it to your Kindle with Paperboy.

## How It Works

1. Click the Paperclip extension icon on any page
2. [Readability](https://github.com/mozilla/readability) extracts the article content, stripping nav, ads, and footers
3. [Turndown](https://github.com/mixmark-io/turndown) converts the cleaned HTML to Markdown
4. A `.md` file is automatically downloaded to your configured folder

The filename follows the format `YYYY-MM-DD-article-title.md` (e.g., `2026-04-01-how-to-build-a-chrome-extension.md`).

## Settings

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

# Build the extension
npx tsx esbuild.config.ts
```

The build outputs to `dist/`. This is the folder you load into Chrome.

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
│   ├── domain/              # Pure functions, no browser APIs
│   │   ├── errors.ts        # Result<T,E> type and domain errors
│   │   ├── filename-generator.ts
│   │   ├── markdown-converter.ts
│   │   └── metadata-formatter.ts
│   ├── application/         # Chrome extension wiring
│   │   ├── content-script.ts
│   │   └── background.ts
│   └── shell/               # Manifest and UI
│       ├── manifest.json
│       ├── options.html
│       └── options.ts
├── test/
│   ├── domain/
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
- esbuild (bundler)
- Vitest (testing)
- ESLint with typescript-eslint (strict type-checked)

## License

MIT
