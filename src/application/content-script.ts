import { convertToMarkdown } from "../domain/markdown-converter.js";
import { generateFilename } from "../domain/filename-generator.js";
import { formatMetadata, type PageMetadata } from "../domain/metadata-formatter.js";

async function clip(): Promise<void> {
  const result = convertToMarkdown(document);

  if (!result.ok) {
    void chrome.runtime.sendMessage({
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

  void chrome.runtime.sendMessage({
    type: "clip-success",
    markdown,
    filename,
  });
}

void clip();
