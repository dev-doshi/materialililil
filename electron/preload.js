const { contextBridge, ipcRenderer } = require("electron");

// Expose a minimal, safe API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // App info
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  getPlatform: () => ipcRenderer.invoke("app:getPlatform"),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  onUpdaterStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("updater:status", handler);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener("updater:status", handler);
  },

  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke("dialog:save", options),
  showOpenDialog: (options) => ipcRenderer.invoke("dialog:open", options),

  // File I/O
  writeFile: (filePath, data) => ipcRenderer.invoke("file:write", filePath, data),
  readFile: (filePath) => ipcRenderer.invoke("file:read", filePath),
  writeFiles: (folderPath, files) =>
    ipcRenderer.invoke("file:writeMultiple", folderPath, files),

  // Window
  setWindowTitle: (title) => ipcRenderer.invoke("window:setTitle", title),

  // Shell
  showItemInFolder: (filePath) =>
    ipcRenderer.invoke("shell:showItemInFolder", filePath),
});
