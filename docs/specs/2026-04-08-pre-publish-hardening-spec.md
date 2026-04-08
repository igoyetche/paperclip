# Pre-Publish Hardening — System Spec

## 1. Problem Statement

Paperclip works correctly on standard article pages, but has no protection against restricted URLs (`chrome://`, `about:`, `edge://`), pages with no DOM access, or hostile page environments (strict CSP, enormous DOMs). When a public user clicks the extension icon on an unsupported page, the content script injection fails silently or throws an uncaught error — no notification, no feedback. Before publishing to the Chrome Web Store, the extension must gracefully handle every page type a user might visit and always communicate what happened.

## 2. Goals and Non-Goals

### Goals

- The extension never fails silently — every click results in either a downloaded file or a clear notification explaining why it couldn't clip
- Restricted/unsupported URLs are detected before content script injection and produce a user-friendly notification
- Errors during content script execution (CSP blocks, Readability failures) are caught and surfaced to the user
- Error messages are written for non-technical end users, not developers

### Non-Goals

- Supporting content extraction on restricted pages (chrome://, about:, PDF viewer) — only graceful rejection
- Retrying failed extractions or offering alternative extraction methods
- Logging or telemetry — all error handling is local and visible only to the user
- Handling pages behind authentication walls (paywalls, login screens) — Readability already extracts whatever the browser has rendered

## 3. Users and Actors

| Actor | Interaction |
|-------|-------------|
| End user | Clicks the Paperclip icon on any page in their browser, expects either a download or a clear message |
| Service worker (background.ts) | Receives the icon click event, decides whether to inject the content script or show an error notification |
| Content script | Runs in the page context, must handle unexpected DOM states and report errors back to the service worker |
| Chrome notifications API | Displays error messages to the user when clipping fails |

## 4. Functional Requirements

- **FR-1:** The service worker must check `tab.url` before injecting the content script. If the URL matches a restricted scheme (`chrome://`, `chrome-extension://`, `about:`, `edge://`, `brave://`, `devtools://`, `view-source:`), it must skip injection and show a notification: "Paperclip can't clip this type of page."
- **FR-2:** The service worker must check that `tab.url` starts with `http://` or `https://` before injecting. File URLs (`file://`) should be allowed if the user has granted file access, but all other schemes are unsupported.
- **FR-3:** If `chrome.scripting.executeScript` throws (e.g., the page's CSP blocks script injection), the service worker must catch the error and show a notification: "Paperclip couldn't access this page. The site may be blocking extensions."
- **FR-4:** The content script must wrap its entire execution in a try/catch. Uncaught errors must be sent to the service worker as a `clip-error` message with a user-friendly description, not a raw stack trace.
- **FR-5:** All user-facing error messages must be plain language, under 80 characters, and avoid technical jargon ("CSP", "DOM", "injection").
- **FR-6:** When Readability fails to extract content, the notification message must say: "This page doesn't have article content to clip." (replacing the current raw `ExtractionError` message).
- **FR-7:** The service worker must handle the case where `tab.id` is undefined (e.g., devtools panels, some pre-rendering contexts) without throwing.

## 5. Non-Functional Requirements

- **NFR-1:** URL validation and scheme checking must add no perceptible delay — it's a synchronous string check
- **NFR-2:** Error notifications must appear within 1 second of the user clicking the icon
- **NFR-3:** No new permissions required — `notifications` and `activeTab` are already declared
- **NFR-4:** All new error paths must be covered by unit tests (URL validation logic) and ideally by E2E tests (once implemented)

## 6. Constraints

- **Chrome Manifest V3:** Service worker is a module (`"type": "module"`). No access to `window`, `document`, or `Blob`/`URL.createObjectURL` — already handled.
- **Existing architecture:** URL validation belongs in the service worker (`background.ts`). Content script error wrapping belongs in `content-script.ts`. Domain layer stays pure — no changes to domain files.
- **Notification API:** `chrome.notifications.create` requires `iconUrl`. The extension already uses `icon-128.png` for this.
- **No new dependencies.** All changes are in application-layer code using existing Chrome APIs.

## 7. Key Scenarios

### Scenario 1: User Clicks on a chrome:// Page

1. User is on `chrome://settings`
2. Clicks the Paperclip icon
3. Service worker receives `onClicked` event with `tab.url = "chrome://settings/"`
4. URL check detects `chrome://` scheme
5. Service worker calls `chrome.notifications.create` with message "Paperclip can't clip this type of page."
6. Content script is never injected
7. No download occurs

### Scenario 2: CSP Blocks Content Script Injection

1. User is on a page with a strict Content-Security-Policy (e.g., some banking sites, GitHub raw pages)
2. Clicks the Paperclip icon
3. Service worker calls `chrome.scripting.executeScript`
4. Chrome throws an error because the page's CSP blocks the script
5. Service worker catches the error
6. Shows notification: "Paperclip couldn't access this page. The site may be blocking extensions."

### Scenario 3: Content Script Throws Unexpected Error

1. User is on a normal `https://` page
2. Clicks the Paperclip icon
3. Content script is injected and starts executing
4. An unexpected runtime error occurs (e.g., Turndown chokes on malformed HTML)
5. The top-level try/catch in `clip()` catches the error
6. Sends `clip-error` message with a friendly description
7. Service worker shows notification

### Scenario 4: Page with No Article Content

1. User is on a login page or splash page with no article-like content
2. Clicks the Paperclip icon
3. Content script runs, Readability returns null
4. Content script sends `clip-error` with message "This page doesn't have article content to clip."
5. Service worker shows the notification
6. No download occurs

## 8. Open Questions

- **Q1:** Should `file://` URLs be supported? Chrome requires the user to explicitly grant file access to extensions. If granted, Readability can extract content from local HTML files. Decision: support it if `tab.url` starts with `file://`, since Chrome handles the permission gate.
- **Q2:** Should there be a visual badge on the extension icon (e.g., a red "X") when clipping fails, in addition to the notification? This would require the `chrome.action.setBadgeText` API. Probably overkill for v1.
- **Q3:** Should the notification auto-dismiss after a timeout, or rely on Chrome's default notification behavior? Chrome notifications auto-dismiss after ~7 seconds by default — this is probably fine.

## 9. Success Criteria

- Clicking Paperclip on `chrome://extensions`, `about:blank`, `chrome-extension://...`, and `edge://settings` all produce a notification without errors in the service worker console
- Clicking Paperclip on a CSP-restricted page produces a notification, not a silent failure
- All user-facing error messages are plain language and under 80 characters
- No new `Uncaught (in promise)` or `Unhandled error` entries appear in the service worker console for any tested scenario
- Existing happy-path behavior is unchanged — article pages still clip correctly

## 10. Context and References

- [Paperclip design doc](./2026-03-31-paperclip-design.md) — architecture overview
- [Paperclip implementation plan](./2026-04-01-paperclip-implementation-plan.md) — original build plan
- [E2E testing spec](./2026-04-07-e2e-testing-spec.md) — E2E test scenarios that should cover these error paths
- Current service worker: `src/application/background.ts`
- Current content script: `src/application/content-script.ts`
- [Chrome extension URL schemes](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#matchAndGlob) — which URLs extensions can access
