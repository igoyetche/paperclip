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
