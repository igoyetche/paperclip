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

  const blob = new Blob([message.markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  void chrome.storage.sync.get({ downloadFolder: "" }).then((settings) => {
    const downloadOptions: chrome.downloads.DownloadOptions = {
      url,
      filename: settings.downloadFolder
        ? `${settings.downloadFolder}/${message.filename}`
        : message.filename,
      saveAs: false,
    };

    chrome.downloads.download(downloadOptions, () => {
      URL.revokeObjectURL(url);
    });
  });
});
