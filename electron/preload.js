// Preload script — runs in a privileged context before the renderer
// Expose only what the web app needs; keep Node APIs off the renderer
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  onUpdateAvailable: (cb) => ipcRenderer.on("update-available", cb),
  onUpdateDownloaded: (cb) => ipcRenderer.on("update-downloaded", cb),
});
