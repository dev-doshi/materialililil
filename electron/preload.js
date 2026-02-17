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
});
