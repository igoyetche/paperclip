import { describe, it, expect } from "vitest";
import { generateFilename } from "../../src/domain/filename-generator.js";

describe("generateFilename", () => {
  it("generates date-prefixed kebab-case filename", () => {
    const result = generateFilename("How to Build a Chrome Extension", new Date(2026, 2, 31));
    expect(result).toBe("2026-03-31-how-to-build-a-chrome-extension.md");
  });

  it("strips special characters", () => {
    const result = generateFilename("Hello, World! (2026) — A Guide", new Date(2026, 3, 1));
    expect(result).toBe("2026-04-01-hello-world-2026-a-guide.md");
  });

  it("collapses multiple hyphens", () => {
    const result = generateFilename("Too   many   spaces", new Date(2026, 0, 15));
    expect(result).toBe("2026-01-15-too-many-spaces.md");
  });

  it("truncates long titles to 80 characters total", () => {
    const longTitle = "a".repeat(200);
    const result = generateFilename(longTitle, new Date(2026, 0, 1));
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result).toMatch(/^2026-01-01-a+\.md$/);
  });

  it("handles empty title with fallback", () => {
    const result = generateFilename("", new Date(2026, 5, 15));
    expect(result).toBe("2026-06-15-untitled.md");
  });

  it("trims leading and trailing hyphens from title slug", () => {
    const result = generateFilename("---Hello---", new Date(2026, 1, 1));
    expect(result).toBe("2026-02-01-hello.md");
  });
});
