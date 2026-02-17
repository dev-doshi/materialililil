const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const serve = require("electron-serve");
const { autoUpdater } = require("electron-updater");

// ─── Configuration ────────────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const APP_NAME = "materialililil";

// Serve the Next.js static export in production
const loadURL = serve({ directory: path.join(__dirname, "../out") });

// ─── Auto-Updater Setup ──────────────────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = require("electron").app.getLogger?.() || console;

function setupAutoUpdater(win) {
  if (isDev) return; // Skip updates in development

  autoUpdater.on("checking-for-update", () => {
    win.webContents.send("updater:status", { status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    win.webContents.send("updater:status", {
      status: "available",
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on("update-not-available", () => {
    win.webContents.send("updater:status", { status: "up-to-date" });
  });

  autoUpdater.on("download-progress", (progress) => {
    win.webContents.send("updater:status", {
      status: "downloading",
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    win.webContents.send("updater:status", {
      status: "downloaded",
      version: info.version,
    });

    // Prompt user to restart
    dialog
      .showMessageBox(win, {
        type: "info",
        title: `${APP_NAME} Update`,
        message: `Version ${info.version} has been downloaded.`,
        detail: "The update will be installed when you restart the app.",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", (err) => {
    win.webContents.send("updater:status", {
      status: "error",
      message: err?.message || "Unknown error",
    });
  });

  // Check for updates every 30 minutes
  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000);
}

// ─── Window Creation ─────────────────────────────────────────────────────────
let mainWindow = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: APP_NAME,
    backgroundColor: "#0a0a0c",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false, // Show when ready to avoid flash
  });

  // Graceful show
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    // In development, load from Next.js dev server
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // In production, serve the static export
    await loadURL(mainWindow);
  }

  setupAutoUpdater(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getPlatform", () => process.platform);
ipcMain.handle("app:checkForUpdates", () => {
  if (!isDev) autoUpdater.checkForUpdates();
});

// ─── App Lifecycle ───────────────────────────────────────────────────────────
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Security: prevent new window creation
app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event, url) => {
    // Allow navigating within the app
    const appUrl = isDev ? "http://localhost:3000" : "file://";
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
});
