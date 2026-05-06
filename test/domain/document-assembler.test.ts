import { describe, it, expect } from "vitest";
import { assembleDocument, type AssembledPage } from "../../src/domain/document-assembler.js";

describe("assembleDocument", () => {
  describe("empty input", () => {
    it("returns empty string for empty pages array", () => {
      const result = assembleDocument([]);
      expect(result).toBe("");
    });
  });

  describe("single page", () => {
    it("produces TOC with one entry and one section", () => {
      const pages: AssembledPage[] = [
        {
          title: "Introduction",
          markdown: "This is the intro content.",
        },
      ];

      const result = assembleDocument(pages);

      // Should contain TOC
      expect(result).toContain("## Table of Contents");
      expect(result).toContain("- [Introduction](#page-1)");

      // Should contain section with anchor and heading
      expect(result).toContain('<a id="page-1"></a>');
      expect(result).toContain("# Introduction");
      expect(result).toContain("This is the intro content.");
    });

    it("strips matching leading H1 from single page markdown", () => {
      const pages: AssembledPage[] = [
        {
          title: "Introduction",
          markdown: "# Introduction\n\nThis is the intro content.",
        },
      ];

      const result = assembleDocument(pages);

      // Should have the H1 from the page title only, not doubled
      const h1Count = (result.match(/^# Introduction$/gm) || []).length;
      expect(h1Count).toBe(1);

      // Content should still be present
      expect(result).toContain("This is the intro content.");
    });

    it("preserves leading H1 if it does not match the title", () => {
      const pages: AssembledPage[] = [
        {
          title: "Main Page",
          markdown: "# Different Title\n\nContent here.",
        },
      ];

      const result = assembleDocument(pages);

      // Both H1s should be present
      expect(result).toContain("# Different Title");
      expect(result).toContain("# Main Page");
      expect(result).toContain("Content here.");
    });
  });

  describe("multi-page (3+)", () => {
    it("produces TOC with all entries and all sections with correct numbering", () => {
      const pages: AssembledPage[] = [
        {
          title: "Chapter 1",
          markdown: "Chapter 1 content.",
        },
        {
          title: "Chapter 2",
          markdown: "Chapter 2 content.",
        },
        {
          title: "Chapter 3",
          markdown: "Chapter 3 content.",
        },
      ];

      const result = assembleDocument(pages);

      // TOC should have all three entries
      expect(result).toContain("- [Chapter 1](#page-1)");
      expect(result).toContain("- [Chapter 2](#page-2)");
      expect(result).toContain("- [Chapter 3](#page-3)");

      // All three sections should be present with correct anchors
      expect(result).toContain('<a id="page-1"></a>\n\n# Chapter 1');
      expect(result).toContain('<a id="page-2"></a>\n\n# Chapter 2');
      expect(result).toContain('<a id="page-3"></a>\n\n# Chapter 3');

      // Content from all pages should be present
      expect(result).toContain("Chapter 1 content.");
      expect(result).toContain("Chapter 2 content.");
      expect(result).toContain("Chapter 3 content.");
    });

    it("separates pages with horizontal rules and blank lines", () => {
      const pages: AssembledPage[] = [
        {
          title: "Page 1",
          markdown: "Content 1.",
        },
        {
          title: "Page 2",
          markdown: "Content 2.",
        },
      ];

      const result = assembleDocument(pages);

      // Should have a separator between TOC and first page
      expect(result).toContain("## Table of Contents\n");
      // Should have separator before each page
      expect(result).toContain("\n---\n\n<a id=\"page-1\"></a>");
      expect(result).toContain("\n---\n\n<a id=\"page-2\"></a>");
    });

    it("preserves order of pages", () => {
      const pages: AssembledPage[] = [
        { title: "First", markdown: "first" },
        { title: "Second", markdown: "second" },
        { title: "Third", markdown: "third" },
      ];

      const result = assembleDocument(pages);

      const firstIndex = result.indexOf("first");
      const secondIndex = result.indexOf("second");
      const thirdIndex = result.indexOf("third");

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  describe("titles with Markdown special characters", () => {
    it("passes through [ ] characters in TOC links", () => {
      const pages: AssembledPage[] = [
        {
          title: "Arrays [intro]",
          markdown: "Content about arrays.",
        },
      ];

      const result = assembleDocument(pages);

      // The title with brackets should appear in the TOC link as-is
      expect(result).toContain("- [Arrays [intro]](#page-1)");
      // And in the H1
      expect(result).toContain("# Arrays [intro]");
    });

    it("passes through ( ) characters in TOC links", () => {
      const pages: AssembledPage[] = [
        {
          title: "Functions (detailed)",
          markdown: "Content about functions.",
        },
      ];

      const result = assembleDocument(pages);

      // The title with parentheses should appear as-is (CommonMark handles this)
      expect(result).toContain("- [Functions (detailed)](#page-1)");
      expect(result).toContain("# Functions (detailed)");
    });

    it("handles complex titles with mixed special characters", () => {
      const pages: AssembledPage[] = [
        {
          title: "API Reference [v2] (Advanced)",
          markdown: "API documentation.",
        },
      ];

      const result = assembleDocument(pages);

      expect(result).toContain("- [API Reference [v2] (Advanced)](#page-1)");
      expect(result).toContain("# API Reference [v2] (Advanced)");
    });
  });

  describe("leading H1 stripping", () => {
    it("strips leading H1 when it matches title exactly", () => {
      const pages: AssembledPage[] = [
        {
          title: "Getting Started",
          markdown: "# Getting Started\n\nThis is the introduction.",
        },
      ];

      const result = assembleDocument(pages);

      // Should not have the H1 from the markdown (already provided by title)
      // Count occurrences of "# Getting Started" — should be exactly 1 (the one we add)
      const matches = result.match(/# Getting Started/g);
      expect(matches).toHaveLength(1);

      // Content after the H1 should still be there
      expect(result).toContain("This is the introduction.");
    });

    it("preserves leading H1 when it differs from title", () => {
      const pages: AssembledPage[] = [
        {
          title: "Resolved Title",
          markdown: "# Original H1\n\nContent with different title.",
        },
      ];

      const result = assembleDocument(pages);

      // Both headings should be present
      expect(result).toContain("# Resolved Title");
      expect(result).toContain("# Original H1");
      expect(result).toContain("Content with different title.");
    });

    it("strips H1 with leading whitespace in markdown", () => {
      const pages: AssembledPage[] = [
        {
          title: "Title",
          markdown: "  \n# Title\n\nContent.",
        },
      ];

      const result = assembleDocument(pages);

      // Should have exactly one "# Title" (the added one)
      const matches = result.match(/^# Title$/m);
      expect(matches).toHaveLength(1);

      expect(result).toContain("Content.");
    });

    it("does not strip H1 if there is no leading H1", () => {
      const pages: AssembledPage[] = [
        {
          title: "Title",
          markdown: "Content without heading.",
        },
      ];

      const result = assembleDocument(pages);

      expect(result).toContain("# Title");
      expect(result).toContain("Content without heading.");
    });

    it("handles markdown with multiple H1s (strips only first if matching)", () => {
      const pages: AssembledPage[] = [
        {
          title: "First Title",
          markdown: "# First Title\n\nSome content.\n\n# Second Title\n\nMore content.",
        },
      ];

      const result = assembleDocument(pages);

      // Should have the added H1 and the second H1 from the markdown
      expect(result).toContain("# First Title");
      expect(result).toContain("# Second Title");
      // Both should appear in the result
      const firstMatches = result.match(/# First Title/g);
      const secondMatches = result.match(/# Second Title/g);
      expect(firstMatches).toHaveLength(1);
      expect(secondMatches).toHaveLength(1);
    });
  });

  describe("formatting and structure", () => {
    it("includes blank line after TOC", () => {
      const pages: AssembledPage[] = [
        { title: "Page 1", markdown: "content" },
      ];

      const result = assembleDocument(pages);

      // TOC section should end with blank line
      expect(result).toContain("## Table of Contents\n- [Page 1](#page-1)\n\n");
    });

    it("includes separator before each page section", () => {
      const pages: AssembledPage[] = [
        { title: "Page 1", markdown: "content1" },
        { title: "Page 2", markdown: "content2" },
      ];

      const result = assembleDocument(pages);

      // Each section (except conceptually the first) should have a separator
      const separators = result.match(/\n---\n/g);
      expect(separators).toHaveLength(2); // One before each page
    });

    it("produces deterministic output", () => {
      const pages: AssembledPage[] = [
        { title: "A", markdown: "content a" },
        { title: "B", markdown: "content b" },
      ];

      const result1 = assembleDocument(pages);
      const result2 = assembleDocument(pages);

      expect(result1).toBe(result2);
    });
  });

  describe("realistic scenarios", () => {
    it("handles a realistic multi-chapter document", () => {
      const pages: AssembledPage[] = [
        {
          title: "Chapter 1: Fundamentals",
          markdown: "# Chapter 1: Fundamentals\n\nLet's start with the basics.",
        },
        {
          title: "Chapter 2: Advanced Topics",
          markdown: "## Overview\n\nMoving on to more complex ideas.",
        },
        {
          title: "Conclusion",
          markdown: "# Conclusion\n\nWe've covered a lot.",
        },
      ];

      const result = assembleDocument(pages);

      // Verify TOC
      expect(result).toContain("## Table of Contents");
      expect(result).toContain("- [Chapter 1: Fundamentals](#page-1)");
      expect(result).toContain("- [Chapter 2: Advanced Topics](#page-2)");
      expect(result).toContain("- [Conclusion](#page-3)");

      // Verify sections
      expect(result).toContain('<a id="page-1"></a>\n\n# Chapter 1: Fundamentals');
      expect(result).toContain('<a id="page-2"></a>\n\n# Chapter 2: Advanced Topics');
      expect(result).toContain('<a id="page-3"></a>\n\n# Conclusion');

      // Verify the duplicate "# Chapter 1: Fundamentals" is stripped
      const ch1Matches = result.match(/# Chapter 1: Fundamentals/g);
      expect(ch1Matches).toHaveLength(1);

      // "# Conclusion" should also appear only once (stripped from markdown)
      const concludeMatches = result.match(/# Conclusion/g);
      expect(concludeMatches).toHaveLength(1);
    });

    it("handles pages with complex markdown formatting", () => {
      const pages: AssembledPage[] = [
        {
          title: "Advanced Concepts",
          markdown: `# Advanced Concepts

## Section 1
This is a subsection with **bold** and *italic* text.

### Nested Content
- Item 1
- Item 2
  - Sub-item

\`\`\`typescript
const x = 42;
\`\`\`

[Link to something](https://example.com)`,
        },
      ];

      const result = assembleDocument(pages);

      expect(result).toContain("- [Advanced Concepts](#page-1)");
      expect(result).toContain('<a id="page-1"></a>\n\n# Advanced Concepts');
      expect(result).toContain("**bold**");
      expect(result).toContain("*italic*");
      expect(result).toContain("## Section 1");
      expect(result).toContain("const x = 42;");
      expect(result).toContain("[Link to something]");
    });

    it("handles pages with code blocks and special chars", () => {
      const pages: AssembledPage[] = [
        {
          title: "Code Examples",
          markdown: `\`\`\`javascript
const obj = { key: [1, 2, 3] };
console.log(obj);
\`\`\``,
        },
      ];

      const result = assembleDocument(pages);

      expect(result).toContain("const obj = { key: [1, 2, 3] };");
      // The [ ] in the code should be preserved
    });
  });

  describe("edge cases", () => {
    it("handles title with trailing/leading whitespace in markdown", () => {
      const pages: AssembledPage[] = [
        {
          title: "Title",
          markdown: "#  Title  \n\nContent.",
        },
      ];

      const result = assembleDocument(pages);

      // Should match and strip even with extra whitespace
      expect(result).not.toContain("#  Title");
      expect(result).toContain("# Title"); // Only the added one
      expect(result).toContain("Content.");
    });

    it("handles very long page content", () => {
      const longContent = "Some line.\n".repeat(1000);
      const pages: AssembledPage[] = [
        {
          title: "Long Page",
          markdown: longContent,
        },
      ];

      const result = assembleDocument(pages);

      expect(result).toContain("## Table of Contents");
      expect(result).toContain("- [Long Page](#page-1)");
      expect(result).toContain('<a id="page-1"></a>');
    });

    it("handles empty markdown content", () => {
      const pages: AssembledPage[] = [
        {
          title: "Empty Page",
          markdown: "",
        },
      ];

      const result = assembleDocument(pages);

      expect(result).toContain("- [Empty Page](#page-1)");
      expect(result).toContain("# Empty Page");
    });

    it("handles pages with only whitespace", () => {
      const pages: AssembledPage[] = [
        {
          title: "Whitespace Page",
          markdown: "   \n  \n  ",
        },
      ];

      const result = assembleDocument(pages);

      expect(result).toContain("# Whitespace Page");
    });

    it("handles many pages (pagination)", () => {
      const pages: AssembledPage[] = Array.from({ length: 25 }, (_, i) => ({
        title: `Page ${i + 1}`,
        markdown: `Content for page ${i + 1}`,
      }));

      const result = assembleDocument(pages);

      // Check first, middle, and last pages are present
      expect(result).toContain("- [Page 1](#page-1)");
      expect(result).toContain("- [Page 13](#page-13)");
      expect(result).toContain("- [Page 25](#page-25)");

      expect(result).toContain('<a id="page-1"></a>');
      expect(result).toContain('<a id="page-13"></a>');
      expect(result).toContain('<a id="page-25"></a>');
    });
  });
});
