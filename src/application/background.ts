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
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon-128.png",
      title: "Paperclip",
      message: message.error,
    });
    return;
  }

  const encoded = new TextEncoder().encode(message.markdown);
  const binary = Array.from(encoded, (b) => String.fromCodePoint(b)).join("");
  const url = "data:text/markdown;base64," + btoa(binary);

  void chrome.storage.sync.get({ downloadFolder: "" }).then((settings) => {
    const downloadOptions: chrome.downloads.DownloadOptions = {
      url,
      filename: settings.downloadFolder
        ? `${settings.downloadFolder}/${message.filename}`
        : message.filename,
      saveAs: false,
    };

    void chrome.downloads.download(downloadOptions);
  });
});
