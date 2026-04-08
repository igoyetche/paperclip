# Chrome Web Store Readiness — System Spec

## 1. Problem Statement

Paperclip is functionally complete and works as an unpacked extension in developer mode, but it cannot be published to the Chrome Web Store in its current state. The store requires a privacy policy, listing assets (description, screenshots, promotional images), and permission justifications. The repository is also missing a LICENSE file, has a placeholder URL in the README, and the icons may need polish. These are all prerequisites that must be completed before submitting the extension for Chrome Web Store review.

## 2. Goals and Non-Goals

### Goals

- The repository contains everything needed to submit Paperclip to the Chrome Web Store in a single session
- A privacy policy document exists and is hosted at a publicly accessible URL
- Store listing copy (description, category, screenshots) is prepared and ready to paste into the Developer Dashboard
- The repo has a proper MIT LICENSE file and the README placeholder URL is fixed
- Permission justifications are documented so the store review goes smoothly
- Extension version is set to `1.0.0` for the public release

### Non-Goals

- Automating the Chrome Web Store submission process (uploading is manual via the Developer Dashboard)
- Setting up CI/CD for automated publishing (can be added later)
- Internationalization or localized store listings — English only for v1
- Paid extension or in-app purchase setup
- Chrome Web Store developer account registration (that's a manual step with payment)

## 3. Users and Actors

| Actor | Interaction |
|-------|-------------|
| Extension developer (you) | Prepares all assets, writes listing copy, submits via Developer Dashboard |
| Chrome Web Store review team | Reviews the submission against store policies, checks permissions, reads privacy policy |
| End users | Discover the extension via the store listing, read the description, view screenshots, install |

## 4. Functional Requirements

### Privacy Policy

- **FR-1:** Create a privacy policy document stating: (a) Paperclip does not collect, transmit, or store any user data externally, (b) all processing happens locally in the browser, (c) `chrome.storage.sync` is used only for user preferences (metadata toggle, download folder), (d) no analytics, tracking, or third-party services are used.
- **FR-2:** The privacy policy must be hosted at a publicly accessible URL. Options: GitHub Pages from the repo, a `PRIVACY.md` rendered via GitHub's raw URL, or a simple standalone page.
- **FR-3:** Add the privacy policy URL to `manifest.json` if supported, or to the store listing.

### Store Listing Assets

- **FR-4:** Write a store listing description (up to 132 characters for the short description, up to 16,000 characters for the full description). The description must explain what Paperclip does, how to use it, and what permissions it needs.
- **FR-5:** Prepare at least 2 screenshots (1280x800) showing: (a) the extension clipping an article page, (b) the downloaded Markdown file content or the options page.
- **FR-6:** Prepare a promotional tile image (440x280) for the store listing. This is optional but recommended for discoverability.
- **FR-7:** Select a store category. "Productivity" is the most appropriate.

### Permission Justifications

- **FR-8:** Document a one-sentence justification for each permission declared in `manifest.json`, ready to paste into the Developer Dashboard:
  - `activeTab` — "Accesses the current tab's content only when the user clicks the extension icon, to extract article text."
  - `scripting` — "Injects a content script into the active tab to run the article extraction and Markdown conversion."
  - `downloads` — "Downloads the generated Markdown file to the user's configured folder."
  - `notifications` — "Shows a notification when article extraction fails, so the user knows why no file was downloaded."
  - `storage` — "Stores user preferences (metadata toggle, download folder path) via chrome.storage.sync."

### Repository Hygiene

- **FR-9:** Add a `LICENSE` file with the MIT license text to the repository root.
- **FR-10:** Fix the README placeholder URL at line 3 (`https://github.com/your-user/send-to-kindle`) — either replace with the real Paperboy repo URL or remove the broken link.
- **FR-11:** Bump `version` in both `package.json` and `src/shell/manifest.json` from `0.1.0` to `1.0.0` for the public release.

### Icons

- **FR-12:** Review the current extension icons (`icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`) for visual quality at each size. The 128px icon is used in the Chrome Web Store listing and should look sharp.
- **FR-13:** The `icon-1024.png` exists in the source but is not referenced in `manifest.json`. Determine if it should be included in the build for store listing purposes or if it's a source asset only.

## 5. Non-Functional Requirements

- **NFR-1:** The privacy policy must be accessible without authentication (no login-gated pages)
- **NFR-2:** Screenshots must accurately represent the current extension behavior — no mockups or aspirational features
- **NFR-3:** Store description must be factual and not make claims the extension can't deliver
- **NFR-4:** All text assets (description, privacy policy) must be written in clear, grammatical English

## 6. Constraints

- **Chrome Web Store policies:** The extension must comply with the [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/). Key areas: accurate description, minimal permissions, privacy policy required for `storage` permission.
- **Developer account:** A Chrome Web Store developer account ($5 one-time fee) must be registered before submission. This is a manual prerequisite.
- **Review timeline:** Chrome Web Store reviews typically take 1-3 business days. The extension may be rejected and require changes — permission justifications and privacy policy are the most common rejection reasons.
- **No `host_permissions`:** The extension uses `activeTab` instead of broad host permissions. This is the preferred pattern and should make review smoother.

## 7. Key Scenarios

### Scenario 1: Preparing and Submitting to the Store

1. All FR items in this spec are completed
2. Run `npm run build` to produce a fresh `dist/`
3. Zip the `dist/` folder
4. Open the Chrome Web Store Developer Dashboard
5. Click "New Item" and upload the zip
6. Fill in: description (from FR-4), screenshots (from FR-5), category "Productivity"
7. Paste permission justifications (from FR-8)
8. Enter the privacy policy URL (from FR-2)
9. Submit for review

### Scenario 2: Store Review Rejection — Permission Justification

1. Chrome review team flags a permission as insufficiently justified
2. Refer to the documented justifications (FR-8) and revise as needed
3. If a permission can be removed without breaking functionality, remove it
4. Resubmit

### Scenario 3: User Discovers Paperclip in the Store

1. User searches "web page to markdown" in the Chrome Web Store
2. Paperclip appears in results with the 440x280 tile image and short description
3. User clicks through to the listing page
4. Reads the full description, views screenshots
5. Clicks "Add to Chrome"
6. Sees the permission prompt listing the 5 declared permissions
7. Accepts and starts using the extension

## 8. Open Questions

- **Q1:** Where should the privacy policy be hosted? Options: (a) GitHub Pages from this repo, (b) a `PRIVACY.md` in the repo root linked via GitHub's raw URL, (c) a separate simple HTML page. GitHub Pages is the most maintainable option if the repo is public.
- **Q2:** Should the store listing mention the Paperboy companion tool, or keep the listing self-contained? Mentioning it adds context but creates a dependency on Paperboy being public.
- **Q3:** What is the real Paperboy repository URL to replace the placeholder in the README? If Paperboy isn't public yet, remove the link entirely.
- **Q4:** Should the version bump to `1.0.0` happen now, or should the store launch be at `0.1.0` and `1.0.0` reserved for after E2E tests and hardening are complete?

## 9. Success Criteria

- The `dist/` folder can be zipped and uploaded to the Chrome Web Store Developer Dashboard without errors
- All required fields in the Developer Dashboard can be filled from assets prepared in this spec
- The privacy policy URL is publicly accessible and accurately describes the extension's data practices
- The store listing description is complete, accurate, and compelling
- The repository has a LICENSE file, no placeholder URLs, and a version number appropriate for public release
- The extension passes Chrome Web Store review on the first submission (or with minimal revisions)

## 10. Context and References

- [Paperclip design doc](./2026-03-31-paperclip-design.md) — architecture overview
- [Paperclip implementation plan](./2026-04-01-paperclip-implementation-plan.md) — original build plan
- [Pre-publish hardening spec](./2026-04-08-pre-publish-hardening-spec.md) — error handling improvements (should be completed before or alongside this spec)
- [E2E testing spec](./2026-04-07-e2e-testing-spec.md) — automated browser tests
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) — submission portal
- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/) — compliance requirements
- [Publishing in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/) — step-by-step publishing guide
- Current manifest: `src/shell/manifest.json`
