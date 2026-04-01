export interface PageMetadata {
  readonly title: string;
  readonly url: string;
  readonly date: Date;
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
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
