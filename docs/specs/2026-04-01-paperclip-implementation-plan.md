# Paperclip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that converts the current web page to a clean Markdown file and downloads it.

**Architecture:** Three-layer design (Domain → Application → Shell). Domain contains pure functions for content extraction, Markdown conversion, filename generation, and metadata formatting — all tested via Vitest. Application wires domain logic into a Chrome content script and service worker. Shell provides manifest.json and options page.

**Tech Stack:** TypeScript (strict), esbuild (bundler), Vitest, ESLint (strict type-checked), Readability, Turndown, Chrome Manifest V3

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | Strict TS config targeting ES2022 + DOM |
| `tsconfig.eslint.json` | ESLint parser config (includes test/) |
| `eslint.config.mjs` | Strict type-checked linting |
| `vitest.config.ts` | Test runner config |
| `esbuild.config.ts` | Bundle content script + background + options |
| `src/domain/errors.ts` | Result type, ExtractionError, ConversionError |
| `src/domain/filename-generator.ts` | Date + sanitized title → filename |
| `src/domain/metadata-formatter.ts` | Title, URL, date → YAML frontmatter |
| `src/domain/markdown-converter.ts` | HTML → Markdown via Readability + Turndown |
| `src/application/content-script.ts` | Orchestrates extraction in page context |
| `src/application/background.ts` | Service worker: icon click → execute script → download |
| `src/shell/manifest.json` | Manifest V3 extension config |
| `src/shell/options.html` | Settings UI |
| `src/shell/options.ts` | Settings logic (chrome.storage.sync) |
| `test/domain/filename-generator.test.ts` | Filename generation tests |
| `test/domain/metadata-formatter.test.ts` | Metadata formatting tests |
| `test/domain/markdown-converter.test.ts` | HTML-to-Markdown conversion tests |
| `test/fixtures/sample-article.html` | HTML fixture for converter tests |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.eslint.json`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "paperclip",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "node esbuild.config.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src test",
    "lint:fix": "eslint --fix src test"
  },
  "engines": {
    "node": ">=22"
  },
  "dependencies": {
    "@mozilla/readability": "^0.5.0",
    "turndown": "^7.2.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.287",
    "@types/turndown": "^5.0.5",
    "@vitest/coverage-v8": "^3.2.4",
    "esbuild": "^0.25.0",
    "eslint": "^10.1.0",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.58.0",
    "vitest": "^3.0.7"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create tsconfig.eslint.json**

```json
{
  "extends": "./tsconfig.json",
  "include": ["src", "test"],
  "compilerOptions": {
    "rootDir": "."
  }
}
```

- [ ] **Step 4: Create eslint.config.mjs**

```javascript
// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
);
```

- [ ] **Step 5: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/application/**", "src/shell/**"],
    },
  },
});
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
coverage/
*.tsbuildinfo
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 8: Verify setup compiles**

Run: `npx tsc --noEmit`
Expected: No errors (no source files yet, clean exit).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.eslint.json eslint.config.mjs vitest.config.ts .gitignore
git commit -m "chore: scaffold project with TypeScript, ESLint, Vitest, esbuild"
```

---

### Task 2: Domain — Result Type and Errors

**Files:**
- Create: `src/domain/errors.ts`

- [ ] **Step 1: Create errors.ts with Result type and error classes**

```typescript
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export class ExtractionError {
  readonly kind = "extraction" as const;
  constructor(readonly message: string) {}
}

export class ConversionError {
  readonly kind = "conversion" as const;
  constructor(readonly message: string) {}
}

export type DomainError = ExtractionError | ConversionError;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/domain/errors.ts
git commit -m "feat: add Result type and domain error classes"
```

---

### Task 3: Domain — Filename Generator (TDD)

**Files:**
- Create: `test/domain/filename-generator.test.ts`
- Create: `src/domain/filename-generator.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { generateFilename } from "../../src/domain/filename-generator.js";

describe("generateFilename", () => {
  it("generates date-prefixed kebab-case filename", () => {
    const result = generateFilename("How to Build a Chrome Extension", new Date("2026-03-31"));
    expect(result).toBe("2026-03-31-how-to-build-a-chrome-extension.md");
  });

  it("strips special characters", () => {
    const result = generateFilename("Hello, World! (2026) — A Guide", new Date("2026-04-01"));
    expect(result).toBe("2026-04-01-hello-world-2026-a-guide.md");
  });

  it("collapses multiple hyphens", () => {
    const result = generateFilename("Too   many   spaces", new Date("2026-01-15"));
    expect(result).toBe("2026-01-15-too-many-spaces.md");
  });

  it("truncates long titles to 80 characters total", () => {
    const longTitle = "a".repeat(200);
    const result = generateFilename(longTitle, new Date("2026-01-01"));
    // 2026-01-01- = 11 chars, .md = 3 chars, so title part max = 66 chars
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result).toMatch(/^2026-01-01-a+\.md$/);
  });

  it("handles empty title with fallback", () => {
    const result = generateFilename("", new Date("2026-06-15"));
    expect(result).toBe("2026-06-15-untitled.md");
  });

  it("trims leading and trailing hyphens from title slug", () => {
    const result = generateFilename("---Hello---", new Date("2026-02-01"));
    expect(result).toBe("2026-02-01-hello.md");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/domain/filename-generator.test.ts`
Expected: FAIL — cannot find module `filename-generator`.

- [ ] **Step 3: Write the implementation**

```typescript
const MAX_FILENAME_LENGTH = 80;
const DATE_PREFIX_LENGTH = 11; // "YYYY-MM-DD-"
const EXTENSION_LENGTH = 3; // ".md"
const MAX_SLUG_LENGTH = MAX_FILENAME_LENGTH - DATE_PREFIX_LENGTH - EXTENSION_LENGTH;

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled";
}

export function generateFilename(title: string, date: Date): string {
  const dateStr = formatDate(date);
  const slug = slugify(title).slice(0, MAX_SLUG_LENGTH);
  return `${dateStr}-${slug}.md`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/domain/filename-generator.test.ts`
Expected: All 6 tests PASS.

- [ ] **Step 5: Run lint**

Run: `npx eslint src/domain/filename-generator.ts`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/domain/filename-generator.ts test/domain/filename-generator.test.ts
git commit -m "feat: add filename generator with date-prefixed kebab-case output"
```

---

### Task 4: Domain — Metadata Formatter (TDD)

**Files:**
- Create: `test/domain/metadata-formatter.test.ts`
- Create: `src/domain/metadata-formatter.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { formatMetadata } from "../../src/domain/metadata-formatter.js";

describe("formatMetadata", () => {
  it("generates YAML frontmatter with title, url, and date", () => {
    const result = formatMetadata({
      title: "My Article",
      url: "https://example.com/article",
      date: new Date("2026-03-31"),
    });

    expect(result).toBe(
      [
        "---",
        "title: My Article",
        "url: https://example.com/article",
        "date: 2026-03-31",
        "---",
        "",
      ].join("\n"),
    );
  });

  it("escapes titles containing YAML special characters", () => {
    const result = formatMetadata({
      title: 'Title with "quotes" and: colons',
      url: "https://example.com",
      date: new Date("2026-01-01"),
    });

    expect(result).toContain('title: "Title with \\"quotes\\" and: colons"');
  });

  it("handles empty title", () => {
    const result = formatMetadata({
      title: "",
      url: "https://example.com",
      date: new Date("2026-01-01"),
    });

    expect(result).toContain('title: ""');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/domain/metadata-formatter.test.ts`
Expected: FAIL — cannot find module `metadata-formatter`.

- [ ] **Step 3: Write the implementation**

```typescript
export interface PageMetadata {
  readonly title: string;
  readonly url: string;
  readonly date: Date;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeYamlValue(value: string): string {
  if (value === "" || /[:"\\]/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function formatMetadata(metadata: PageMetadata): string {
  const lines = [
    "---",
    `title: ${escapeYamlValue(metadata.title)}`,
    `url: ${metadata.url}`,
    `date: ${formatDate(metadata.date)}`,
    "---",
    "",
  ];
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/domain/metadata-formatter.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 5: Run lint**

Run: `npx eslint src/domain/metadata-formatter.ts`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/domain/metadata-formatter.ts test/domain/metadata-formatter.test.ts
git commit -m "feat: add metadata formatter for YAML frontmatter generation"
```

---

### Task 5: Domain — Markdown Converter (TDD)

**Files:**
- Create: `test/fixtures/sample-article.html`
- Create: `test/domain/markdown-converter.test.ts`
- Create: `src/domain/markdown-converter.ts`

- [ ] **Step 1: Create HTML fixture**

Create `test/fixtures/sample-article.html`:

```html
<!DOCTYPE html>
<html>
<head><title>Test Article</title></head>
<body>
  <nav><a href="/">Home</a><a href="/about">About</a></nav>
  <article>
    <h1>Test Article Title</h1>
    <p>This is the <strong>first paragraph</strong> with a <a href="https://example.com">link</a>.</p>
    <h2>Section Two</h2>
    <ul>
      <li>Item one</li>
      <li>Item two</li>
    </ul>
    <pre><code>const x = 42;</code></pre>
    <table>
      <thead><tr><th>Name</th><th>Value</th></tr></thead>
      <tbody><tr><td>Alpha</td><td>1</td></tr></tbody>
    </table>
  </article>
  <footer><p>Copyright 2026</p></footer>
</body>
</html>
```

- [ ] **Step 2: Write the failing tests**

The converter takes a `Document` (the real DOM in Chrome, JSDOM in tests). Tests use a `htmlToDocument` helper.

Add `jsdom` and `@types/jsdom` as dev dependencies — update `package.json` devDependencies:

```json
"jsdom": "^26.0.0",
"@types/jsdom": "^21.1.7"
```

Run: `npm install`

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { convertToMarkdown } from "../../src/domain/markdown-converter.js";

function htmlToDocument(html: string): Document {
  const dom = new JSDOM(html, { url: "https://localhost" });
  return dom.window.document;
}

const fixtureHtml = readFileSync(
  resolve(__dirname, "../fixtures/sample-article.html"),
  "utf-8",
);

describe("convertToMarkdown", () => {
  it("converts article HTML to Markdown", () => {
    const result = convertToMarkdown(htmlToDocument(fixtureHtml));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toContain("# Test Article Title");
    expect(result.value).toContain("**first paragraph**");
    expect(result.value).toContain("[link](https://example.com)");
    expect(result.value).toContain("## Section Two");
    expect(result.value).toContain("- Item one");
    expect(result.value).toContain("`const x = 42;`");
  });

  it("strips nav and footer content", () => {
    const result = convertToMarkdown(htmlToDocument(fixtureHtml));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).not.toContain("Home");
    expect(result.value).not.toContain("About");
    expect(result.value).not.toContain("Copyright");
  });

  it("returns ExtractionError for empty content", () => {
    const result = convertToMarkdown(htmlToDocument("<html><body></body></html>"));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("extraction");
  });

  it("returns ExtractionError for non-article pages", () => {
    const result = convertToMarkdown(htmlToDocument("<html><body><nav>Just nav</nav></body></html>"));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("extraction");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run test/domain/markdown-converter.test.ts`
Expected: FAIL — cannot find module `markdown-converter`.

- [ ] **Step 4: Write the implementation**

```typescript
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { type Result, ok, err, ExtractionError } from "./errors.js";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

export function convertToMarkdown(doc: Document): Result<string, ExtractionError> {
  const clonedDoc = doc.cloneNode(true) as Document;
  const reader = new Readability(clonedDoc);
  const article = reader.parse();

  if (!article?.content) {
    return err(new ExtractionError("Could not extract article content from this page"));
  }

  const markdown = turndown.turndown(article.content);
  return ok(markdown.trim());
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run test/domain/markdown-converter.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 6: Run lint**

Run: `npx eslint src/domain/markdown-converter.ts`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/domain/markdown-converter.ts test/domain/markdown-converter.test.ts test/fixtures/sample-article.html package.json package-lock.json
git commit -m "feat: add Markdown converter using Readability and Turndown"
```

---

### Task 6: Application — Content Script

**Files:**
- Create: `src/application/content-script.ts`

- [ ] **Step 1: Write the content script**

This runs in the page context. It uses the domain functions to extract and convert, then sends the result to the service worker.

```typescript
import { convertToMarkdown } from "../domain/markdown-converter.js";
import { generateFilename } from "../domain/filename-generator.js";
import { formatMetadata, type PageMetadata } from "../domain/metadata-formatter.js";

async function clip(): Promise<void> {
  const result = convertToMarkdown(document);

  if (!result.ok) {
    chrome.runtime.sendMessage({
      type: "clip-error",
      error: result.error.message,
    });
    return;
  }

  const settings = await chrome.storage.sync.get({
    includeMetadata: true,
  });

  let markdown = result.value;

  if (settings.includeMetadata === true) {
    const metadata: PageMetadata = {
      title: document.title,
      url: window.location.href,
      date: new Date(),
    };
    markdown = formatMetadata(metadata) + markdown;
  }

  const filename = generateFilename(document.title, new Date());

  chrome.runtime.sendMessage({
    type: "clip-success",
    markdown,
    filename,
  });
}

void clip();
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/application/content-script.ts
git commit -m "feat: add content script that extracts page and sends to service worker"
```

---

### Task 7: Application — Service Worker (Background)

**Files:**
- Create: `src/application/background.ts`

- [ ] **Step 1: Write the service worker**

```typescript
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;

  void chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content-script.js"],
  });
});

interface ClipSuccess {
  readonly type: "clip-success";
  readonly markdown: string;
  readonly filename: string;
}

interface ClipError {
  readonly type: "clip-error";
  readonly error: string;
}

type ClipMessage = ClipSuccess | ClipError;

chrome.runtime.onMessage.addListener((message: ClipMessage) => {
  if (message.type === "clip-error") {
    void chrome.notifications.create({
      type: "basic",
      iconUrl: "icon-128.png",
      title: "Paperclip",
      message: message.error,
    });
    return;
  }

  if (message.type === "clip-success") {
    const blob = new Blob([message.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    void chrome.storage.sync.get({ downloadFolder: "" }).then((settings) => {
      const downloadOptions: chrome.downloads.DownloadOptions = {
        url,
        filename: settings.downloadFolder
          ? `${settings.downloadFolder}/${message.filename}`
          : message.filename,
        saveAs: false,
      };

      void chrome.downloads.download(downloadOptions, () => {
        URL.revokeObjectURL(url);
      });
    });
  }
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/application/background.ts
git commit -m "feat: add service worker for icon click handling and file download"
```

---

### Task 8: Shell — Manifest and Options Page

**Files:**
- Create: `src/shell/manifest.json`
- Create: `src/shell/options.html`
- Create: `src/shell/options.ts`

- [ ] **Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Paperclip",
  "description": "Convert any web page to a clean Markdown file",
  "version": "0.1.0",
  "permissions": [
    "activeTab",
    "scripting",
    "downloads",
    "notifications",
    "storage"
  ],
  "action": {
    "default_title": "Clip this page to Markdown"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": false
  },
  "icons": {
    "16": "icon-16.png",
    "48": "icon-48.png",
    "128": "icon-128.png"
  }
}
```

- [ ] **Step 2: Create options.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 16px;
      min-width: 320px;
      font-size: 14px;
      color: #333;
    }
    h2 {
      font-size: 16px;
      margin: 0 0 16px;
    }
    label {
      display: block;
      margin-bottom: 12px;
    }
    input[type="text"] {
      display: block;
      width: 100%;
      margin-top: 4px;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    }
    .saved {
      color: #2e7d32;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .saved.visible {
      opacity: 1;
    }
  </style>
</head>
<body>
  <h2>Paperclip Settings</h2>

  <label>
    <input type="checkbox" id="includeMetadata" checked>
    Include metadata header (title, URL, date)
  </label>

  <label>
    Download folder
    <input type="text" id="downloadFolder" placeholder="Leave empty for browser default">
  </label>

  <span class="saved" id="saved">Settings saved</span>

  <script src="options.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create options.ts**

```typescript
const includeMetadataEl = document.getElementById("includeMetadata") as HTMLInputElement;
const downloadFolderEl = document.getElementById("downloadFolder") as HTMLInputElement;
const savedEl = document.getElementById("saved") as HTMLElement;

function showSaved(): void {
  savedEl.classList.add("visible");
  setTimeout(() => {
    savedEl.classList.remove("visible");
  }, 1500);
}

function save(): void {
  void chrome.storage.sync.set({
    includeMetadata: includeMetadataEl.checked,
    downloadFolder: downloadFolderEl.value.trim(),
  }).then(showSaved);
}

void chrome.storage.sync.get({
  includeMetadata: true,
  downloadFolder: "",
}).then((settings) => {
  includeMetadataEl.checked = settings.includeMetadata as boolean;
  downloadFolderEl.value = settings.downloadFolder as string;
});

includeMetadataEl.addEventListener("change", save);
downloadFolderEl.addEventListener("input", save);
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/shell/manifest.json src/shell/options.html src/shell/options.ts
git commit -m "feat: add manifest.json and options page for settings"
```

---

### Task 9: Build Configuration

**Files:**
- Create: `esbuild.config.ts`

- [ ] **Step 1: Create esbuild.config.ts**

```typescript
import { build } from "esbuild";
import { cpSync } from "node:fs";

async function run(): Promise<void> {
  await build({
    entryPoints: [
      "src/application/content-script.ts",
      "src/application/background.ts",
      "src/shell/options.ts",
    ],
    bundle: true,
    outdir: "dist",
    format: "esm",
    target: "chrome120",
    minify: false,
    sourcemap: true,
    outExtension: { ".js": ".js" },
    entryNames: "[name]",
  });

  // Copy static assets to dist
  cpSync("src/shell/manifest.json", "dist/manifest.json");
  cpSync("src/shell/options.html", "dist/options.html");

  console.log("Build complete → dist/");
}

void run();
```

- [ ] **Step 2: Run the build**

Run: `npx tsx esbuild.config.ts`
Expected: `dist/` contains `content-script.js`, `background.js`, `options.js`, `manifest.json`, `options.html`, and source maps.

- [ ] **Step 3: Verify dist contents**

Run: `ls dist/`
Expected: `background.js`, `background.js.map`, `content-script.js`, `content-script.js.map`, `manifest.json`, `options.html`, `options.js`, `options.js.map`

- [ ] **Step 4: Commit**

```bash
git add esbuild.config.ts
git commit -m "feat: add esbuild config for extension bundling"
```

---

### Task 10: Run All Tests and Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (filename-generator: 6, metadata-formatter: 3, markdown-converter: 4 = 13 total).

- [ ] **Step 2: Run lint on all files**

Run: `npx eslint src test`
Expected: No errors.

- [ ] **Step 3: Run full build**

Run: `npx tsx esbuild.config.ts`
Expected: Build succeeds, `dist/` populated.

- [ ] **Step 4: Commit any remaining changes**

If any fixes were needed:

```bash
git add -A
git commit -m "fix: address lint and test issues from final verification"
```

---

## Manual Testing (Post-Build)

After all tasks are complete, load the extension in Chrome for manual verification:

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `dist/` folder
4. Navigate to any article page
5. Click the Paperclip icon
6. Verify a `.md` file downloads with correct content, frontmatter, and filename

**Note:** Extension icons (`icon-16.png`, `icon-48.png`, `icon-128.png`) are not included in this plan — a simple placeholder or the default Chrome extension icon will work initially. Icons can be added later.
