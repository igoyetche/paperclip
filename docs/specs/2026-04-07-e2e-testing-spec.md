# Paperclip E2E Testing — System Spec

## 1. Problem Statement

Paperclip has unit tests covering domain logic (markdown conversion, filename generation, metadata formatting), but the application and shell layers — service worker, content script, options page — are untested. Bugs like `URL.createObjectURL` not being available in MV3 service workers only surface during manual testing in Chrome. We need automated E2E tests that load the real extension in a real browser and verify the full clip workflow end-to-end.

## 2. Goals and Non-Goals

### Goals

- Automated tests that load the built extension into Chromium and exercise the full user workflow: click icon, extract content, download Markdown file
- Tests verify the downloaded file exists and contains expected content (headings, frontmatter, clean Markdown)
- Tests cover the error path: clipping a page with no extractable content triggers a notification
- Tests cover the options page: toggling metadata inclusion, setting download folder
- Tests run in CI without a display server (headless Chromium)
- Tests are triggered via a dedicated npm script (`test:e2e`), separate from unit tests (`test`)

### Non-Goals

- Cross-browser testing (Firefox, Safari) — Chromium only for now
- Visual regression testing or screenshot comparison
- Performance benchmarking or load testing
- Testing Chrome Web Store publishing flow
- Mocking Chrome APIs — this spec is specifically about real browser E2E tests

## 3. Users and Actors

| Actor | Interaction |
|-------|-------------|
| Developer | Runs `npm run test:e2e` locally or in CI to verify extension works end-to-end |
| CI pipeline | Executes E2E tests on push/PR to catch regressions before merge |
| Chromium browser | Launched by Playwright with the unpacked extension loaded via `--load-extension` |
| Paperclip extension | Service worker + content script executing inside the browser under test |

## 4. Functional Requirements

- **FR-1:** Tests must build the extension (`npm run build`) before running, ensuring `dist/` is up-to-date
- **FR-2:** Tests must launch Chromium with the `dist/` folder loaded as an unpacked extension via `--load-extension=dist/` and `--disable-extensions-except=dist/`
- **FR-3:** Happy path test: navigate to a fixture HTML page served locally, trigger the extension action, and assert a `.md` file is downloaded
- **FR-4:** Downloaded file content assertion: verify the Markdown contains expected headings, body text, and links from the fixture page
- **FR-5:** Metadata test: verify the downloaded file includes YAML frontmatter with title, URL, and date when metadata is enabled
- **FR-6:** Metadata opt-out test: disable metadata via the options page, clip a page, verify frontmatter is absent
- **FR-7:** Error path test: navigate to a page with no extractable article content, trigger the extension, verify a Chrome notification is created (or at minimum, no file is downloaded)
- **FR-8:** Extension trigger mechanism: since Playwright cannot click the browser toolbar icon, trigger the action programmatically — either via the service worker's `chrome.action.onClicked` dispatch or by navigating to a test page that invokes the content script directly
- **FR-9:** A local static file server (or Playwright's `route` API) must serve fixture HTML pages so the content script can run in a realistic page context

## 5. Non-Functional Requirements

- **NFR-1:** E2E tests must complete in under 30 seconds on a typical development machine
- **NFR-2:** Tests must work in headless mode (`--headless=new` flag, required for extension support in headless Chromium)
- **NFR-3:** Tests must not require any manual setup beyond `npm install` (Playwright browser installation handled via `npx playwright install chromium`)
- **NFR-4:** Tests must be isolated — each test starts with a fresh browser context, no shared state between tests
- **NFR-5:** Test fixtures must be self-contained HTML files committed to the repository (no external URL dependencies)

## 6. Constraints

- **Technology:** Playwright is the only E2E framework with native support for loading unpacked Chrome extensions — use `@playwright/test`
- **Browser:** Chromium only — MV3 extensions are Chrome-specific, and Playwright's extension loading only works with Chromium
- **Headless mode:** Must use `--headless=new` (the "new headless" mode). The legacy `--headless` flag does not support extensions
- **Extension activation:** Playwright cannot interact with the browser toolbar. The extension action must be triggered programmatically — see FR-8
- **Existing stack:** Tests must use the same TypeScript + ESLint configuration as the rest of the project. The E2E test files should be linted with the same relaxed rules as `test/**/*.ts`
- **Build dependency:** The extension must be built before E2E tests run. The `test:e2e` script should ensure `dist/` is current

## 7. Key Scenarios

### Scenario 1: Happy Path — Clip an Article Page

1. Build the extension (`npm run build`)
2. Launch Chromium with `--load-extension=dist/` and `--disable-extensions-except=dist/`
3. Serve `test/fixtures/sample-article.html` (or a new E2E-specific fixture) via a local server
4. Navigate to the fixture page
5. Trigger the extension action programmatically
6. Wait for the download event
7. Read the downloaded `.md` file
8. Assert: file exists, filename matches `YYYY-MM-DD-*.md` pattern
9. Assert: content contains expected Markdown (headings, bold text, links, list items)
10. Assert: YAML frontmatter is present with title, URL, and date

### Scenario 2: Clip with Metadata Disabled

1. Open the extension's options page (`chrome-extension://<id>/options.html`)
2. Uncheck the "Include metadata header" checkbox
3. Navigate to the fixture page
4. Trigger the extension action
5. Wait for the download
6. Assert: downloaded file does NOT contain `---` frontmatter block
7. Assert: Markdown content is still present and correct

### Scenario 3: Non-Extractable Page (Error Path)

1. Navigate to a minimal page with no article content (e.g., `<html><body><nav>Just nav</nav></body></html>`)
2. Trigger the extension action
3. Wait a reasonable timeout
4. Assert: no file was downloaded
5. Optional: verify a notification was created (if Playwright can observe `chrome.notifications`)

### Scenario 4: Download Folder Configuration

1. Open the options page
2. Set download folder to `paperclip-clips`
3. Navigate to the fixture page and trigger the extension
4. Assert: downloaded file path includes `paperclip-clips/` prefix

## 8. Open Questions

- **Q1:** How exactly should we trigger the extension action? Options: (a) use `chrome.runtime.sendMessage` from the test page to simulate the content script result, (b) use `serviceWorker.evaluate()` to dispatch `chrome.action.onClicked`, (c) inject the content script directly via `chrome.scripting.executeScript` from the test. Option (b) is the most realistic.
- **Q2:** Can Playwright observe `chrome.notifications.create` calls? If not, the error path test (Scenario 3) may be limited to asserting "no download occurred" rather than "notification was shown."
- **Q3:** Should E2E fixtures reuse `test/fixtures/sample-article.html` or have their own dedicated fixtures in `test/e2e/fixtures/`? Separate fixtures allow E2E-specific content without affecting unit tests.
- **Q4:** Should the `test:e2e` script automatically run `npm run build` first, or should the developer be expected to build manually? Auto-building is safer but slower if iterating on tests only.

## 9. Success Criteria

- All 4 key scenarios pass in both headed and headless (`--headless=new`) Chromium
- `npm run test:e2e` exits with code 0 on a clean build
- Tests catch the class of bugs we've hit manually (e.g., `URL.createObjectURL` in service worker would cause Scenario 1 to fail)
- Tests run reliably in CI without flakiness (no hard-coded timeouts, proper wait conditions)

## 10. Context and References

- [Paperclip design doc](./2026-03-31-paperclip-design.md) — architecture overview (domain/application/shell layers)
- [Paperclip implementation plan](./2026-04-01-paperclip-implementation-plan.md) — task-by-task build plan
- [Playwright Chrome Extensions guide](https://playwright.dev/docs/chrome-extensions) — official docs for testing extensions
- Existing unit tests: `test/domain/` — covers markdown-converter, filename-generator, metadata-formatter
- Current build output: `dist/` — contains `manifest.json`, JS bundles, icons, `options.html`
