const includeMetadataEl = document.getElementById("includeMetadata") as HTMLInputElement;
const downloadFolderEl = document.getElementById("downloadFolder") as HTMLInputElement;
const savedEl = document.getElementById("saved") as HTMLElement;

function showSaved(): void {
  savedEl.classList.add("visible");
  setTimeout(() => {
    savedEl.classList.remove("visible");
  }, 1500);
}

function save(): void {
  void chrome.storage.sync.set({
    includeMetadata: includeMetadataEl.checked,
    downloadFolder: downloadFolderEl.value.trim(),
  }).then(showSaved);
}

void chrome.storage.sync.get({
  includeMetadata: true,
  downloadFolder: "",
}).then((settings) => {
  includeMetadataEl.checked = settings.includeMetadata as boolean;
  downloadFolderEl.value = settings.downloadFolder as string;
});

includeMetadataEl.addEventListener("change", save);
downloadFolderEl.addEventListener("input", save);
