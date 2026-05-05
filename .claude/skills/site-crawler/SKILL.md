---
name: site-crawler
description: Discover and order sub-pages of a documentation site, producing a URL list for the Paperclip CLI
---

# Site Crawler Skill

This Skill helps you turn a multi-page documentation website into an ordered URL list that the Paperclip CLI can then convert into a single Markdown document for delivery to Kindle.

## When to Use

Use this Skill when you want to:
- Extract all pages from a documentation site (e.g., framework guides, tutorials, API references)
- Preserve the site's reading order (as presented in the navigation)
- Prepare the URL list for the Paperclip CLI (`npm run crawl -- --urls urls.txt -o guide.md`)

**You run the Skill first.** The Skill produces a `urls.txt` file. Then you run the CLI yourself.

---

## Procedure

### Step 1: Get the root URL from the user

Ask the user for the starting URL of the documentation site. Examples:
- `https://www.promptingguide.ai/`
- `https://docs.langchain.com/`
- `https://example.com/guide/`

Extract the host from this URL (e.g., `www.promptingguide.ai`). All sub-pages must be on the same host—any cross-domain links will be skipped by the CLI.

### Step 2: Try fetching the site's sitemap

Make HTTP GET requests to:
1. `https://{host}/sitemap.xml`
2. `https://{host}/sitemap_index.xml` (if sitemap.xml points to a sitemap index)

**If the sitemap fetch succeeds:**
- Parse the XML
- Extract all `<loc>` URLs
- Filter to URLs on the same host as the root URL
- Keep them in the order they appear in the sitemap
- Skip to Step 5

**If the sitemap fetch fails (404, invalid XML, or any error):**
- Continue to Step 3

### Step 3: Fetch the root page as a fallback

If no usable sitemap was found, fetch the root URL's HTML directly. Save the full page for the next step.

### Step 4: Identify the primary navigation

Read the root page's HTML and identify the **main navigation structure** that shows the content hierarchy. Common patterns:
- **Sidebar navigation** (left or right column with a tree/list of links)
- **Breadcrumb navigation** (links showing the current path)
- **Top navigation bar** with dropdown menus
- **Table of contents** on the main page
- **Footer navigation** links

Look for the navigation structure that **logically orders the content**—not peripheral links like "Home", "About", "Contact", "GitHub", or "Changelog". The primary nav usually lives in a semantic container like:
- `<nav>`, `<aside>`, or `<div class="*sidebar*" / "*nav*" / "*menu*">`
- A list structure (`<ul>`, `<ol>`) with `<a>` children, possibly nested
- A heading like "Contents", "Documentation", "Chapters", "Sections", or "Topics"

### Step 5: Extract sub-page URLs in reading order

Walk the primary navigation **top-to-bottom** and collect all `href` attributes that:
1. Point to the same host as the root URL
2. Are in-domain relative links (not external links)
3. Are unique (deduplicate as you go)

**Preserve the order** as they appear in the navigation. If the navigation is nested (chapters → sections), flatten it into a single list while preserving top-to-bottom reading order.

**Example:** If the sidebar shows:
```
Introduction
  Basics
  Advanced
Techniques
  Few-shot
  Chain-of-thought
Reference
  API
  Examples
```

Extract the URLs in this order:
```
https://example.com/introduction
https://example.com/introduction/basics
https://example.com/introduction/advanced
https://example.com/techniques
https://example.com/techniques/fewshot
https://example.com/techniques/chainofthought
https://example.com/reference
https://example.com/reference/api
https://example.com/reference/examples
```

### Step 6: Apply user filters (if any)

If the user asks for refinement—e.g., "skip the API reference section" or "only include the first 5 chapters"—identify and remove the matching URLs. Then regenerate the `urls.txt` file with the updated list.

### Step 7: Write the URL list to a file

Create a file (default name: `urls.txt`) containing the URLs in the **§4.1 flat-with-optional-title format**:

```
# Title Comment
https://url-1
https://url-2

# Another Title
https://url-3
```

**Format rules:**
- One URL per line (no blank lines between URL and title)
- Lines starting with `#` are title comments
- A title-comment immediately above a URL becomes that URL's title (no blank line between them)
- Blank lines separate groups visually but have no semantic meaning
- A title-comment separated from a URL by a blank line is ignored
- A trailing comment with no URL below it is ignored

**Title-comment guidance:**
- Only include a title-comment if you are **confident about the page's title**
- Derive the title from:
  1. The navigation link text (e.g., "Introduction", "API Reference")
  2. The page's own `<h1>` heading if you fetch it
  3. The page's `<title>` tag if it's clear and descriptive
- **Do not invent placeholder titles** like `# Page 1`, `# TODO`, or `# Section`. An omitted title is better than a wrong one; the CLI will derive the title from the page's actual content.

**Example:**

```
# Introduction
https://www.promptingguide.ai/introduction

# Basics
https://www.promptingguide.ai/introduction/basics

# Few-shot Prompting
https://www.promptingguide.ai/techniques/fewshot

https://www.promptingguide.ai/techniques/chainofthought

# API Reference
https://www.promptingguide.ai/reference
```

In this example:
- The first three URLs have confident title-comments
- The fourth URL has no comment—the CLI will derive its title from the page
- The fifth URL has a title-comment

### Step 8: Summarize for the user

Print a summary to the user, e.g.:

```
✓ Found {count} URLs from {source}
  Saved to: urls.txt

Next step:
npm run crawl -- --urls urls.txt -o guide.md
```

Replace `{count}` with the number of URLs and `{source}` with either `"sitemap.xml"` or `"root page navigation"` depending on which was used.

---

## Interactive Refinement

The user may ask for changes after seeing the initial output. Common requests:

- **"Skip the API reference section"** → Identify and remove URLs matching `/api/` or `/reference/`; regenerate `urls.txt`
- **"Only include chapters 1-5"** → Filter to the first 5 URLs; regenerate
- **"Follow the right sidebar instead"** → Fetch the root page again, identify the right sidebar nav, and regenerate
- **"Add this URL: ..."** → Insert the new URL in the appropriate position; regenerate

For any refinement, regenerate the file and re-run Step 8 (summarize).

---

## Concrete Example

**Input:** User asks to crawl `https://www.promptingguide.ai/`

**Process:**
1. Check for `https://www.promptingguide.ai/sitemap.xml` → not found or malformed
2. Fetch `https://www.promptingguide.ai/` root page
3. Identify the left sidebar with links like "Introduction", "Basics", "Techniques", etc.
4. Extract ~50 unique in-domain URLs in sidebar order
5. Write to `urls.txt`:
   ```
   # Introduction
   https://www.promptingguide.ai/introduction
   
   # Basics
   https://www.promptingguide.ai/introduction/basics
   
   # Few-shot Prompting
   https://www.promptingguide.ai/techniques/fewshot
   
   # Zero-shot Prompting
   https://www.promptingguide.ai/techniques/zeroshot
   
   https://www.promptingguide.ai/techniques/chainofthought
   
   # [... more entries ...]
   ```
6. Summarize:
   ```
   ✓ Found 47 URLs from root page navigation
     Saved to: urls.txt

   Next step:
   npm run crawl -- --urls urls.txt -o guide.md
   ```

**Output:** The file `urls.txt` is ready for the Paperclip CLI.

---

## Important Notes

### No CLI Invocation

**The Skill does NOT run the CLI.** After you produce `urls.txt`, the user runs the CLI themselves:

```bash
npm run crawl -- --urls urls.txt -o guide.md
```

The CLI will:
1. Read the `urls.txt` file
2. Fetch each URL
3. Convert each page to Markdown
4. Concatenate them into a single document with a table of contents
5. Write the output to `guide.md` (or the file specified with `-o`)

Your job ends when `urls.txt` is written and the user is ready to run the command.

### Sitemap Preference

Always try the sitemap first (Step 2). If the site has a well-formed `sitemap.xml`, use it—no need to reverse-engineer the nav structure. Fall back to nav-reading only if the sitemap fetch fails or is invalid.

### Title Comments Are Optional

The most important thing is to **get the URLs right and in the correct order**. Title comments are a nice-to-have. If you're unsure about a page's title, leave the comment out. The CLI's title-fallback chain is robust:

1. Title from `urls.txt` (if you provided one)
2. First `<h1>` on the page
3. The page's `<title>` tag
4. A slug derived from the URL path

A missing title comment is always better than a wrong one.

### Cross-Domain URLs

The CLI will reject any URLs that don't match the root domain. So don't include them in `urls.txt`—the user will see them skipped with a warning. Focus on keeping the in-domain URLs accurate and ordered.

---

## Troubleshooting

**"I'm not sure which navigation structure to use"**
→ Look for the one that contains all the main content pages. Often it's the most prominent nav on the page. If in doubt, ask the user: "I see a sidebar with 'Chapters 1-5' and a top nav with 'API, Blog, Docs'—which should I follow?"

**"Some URLs appear in multiple places"**
→ Deduplicate as you extract. The first occurrence's title-comment wins.

**"The navigation is nested very deeply"**
→ Flatten it into a single top-to-bottom list. The CLI doesn't care about hierarchy—it just fetches and concatenates.

**"I'm not confident about a title"**
→ Omit it. The CLI will handle it.

---

## Success

You've completed this Skill when:
- ✓ `urls.txt` contains one URL per line
- ✓ URLs are ordered as the site presents them (top-to-bottom in nav or sitemap)
- ✓ All URLs are on the same host as the root URL
- ✓ Title-comments are accurate and complete (or omitted if uncertain)
- ✓ The user is ready to run `npm run crawl -- --urls urls.txt -o guide.md`
