const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  protocol,
  net,
  nativeImage,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");

// ─── Configuration ────────────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const APP_NAME = "materialililil";

// ─── Register Custom Protocol (MUST be before app.ready) ─────────────────────
// Registering as privileged gives "app://" a proper origin with localStorage,
// sessionStorage, cookies, and all web APIs — unlike file:// which is sandboxed.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// ─── Auto-Updater Setup ──────────────────────────────────────────────────────
// On macOS, Squirrel.Mac validates code signatures at the OS level.
// Since the app is unsigned, we cannot auto-install updates on macOS.
// Instead we detect new versions and open the download page.
const isMac = process.platform === "darwin";
autoUpdater.autoDownload = !isMac; // macOS: notify only; others: download automatically
autoUpdater.autoInstallOnAppQuit = !isMac;
autoUpdater.forceCodeSigning = false;

// Log to both console and a file in the app's userData directory
const logPath = path.join(app.getPath("userData"), "updater.log");
function logUpdate(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log("[AutoUpdater]", msg);
  try { fs.appendFileSync(logPath, line); } catch {}
}

function setupAutoUpdater(win) {
  if (isDev) {
    logUpdate("Skipping auto-updater in dev mode");
    return;
  }

  logUpdate(`Auto-updater starting. Current version: ${app.getVersion()}`);

  autoUpdater.on("checking-for-update", () => {
    logUpdate("Checking for update...");
    win.webContents.send("updater:status", { status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    logUpdate(`Update available: v${info.version}`);
    win.webContents.send("updater:status", {
      status: "available",
      version: info.version,
      releaseDate: info.releaseDate,
    });

    // On macOS (unsigned app), prompt user to download from GitHub
    if (isMac) {
      dialog
        .showMessageBox(win, {
          type: "info",
          title: `${APP_NAME} Update Available`,
          message: `Version ${info.version} is available.`,
          detail:
            "This app is not code-signed, so automatic updates are not supported on macOS. Would you like to download the new version?",
          buttons: ["Download", "Later"],
          defaultId: 0,
        })
        .then(({ response }) => {
          if (response === 0) {
            shell.openExternal(
              `https://github.com/dev-doshi/materialililil/releases/latest`
            );
          }
        });
    }
  });

  autoUpdater.on("update-not-available", (info) => {
    logUpdate(`Up to date. Latest: v${info.version}`);
    win.webContents.send("updater:status", { status: "up-to-date" });
  });

  autoUpdater.on("download-progress", (progress) => {
    logUpdate(`Download progress: ${Math.round(progress.percent)}%`);
    win.webContents.send("updater:status", {
      status: "downloading",
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    logUpdate(`Update downloaded: v${info.version}`);
    win.webContents.send("updater:status", {
      status: "downloaded",
      version: info.version,
    });

    // Only auto-install on non-macOS (macOS uses manual download flow)
    if (!isMac) {
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
    }
  });

  autoUpdater.on("error", (err) => {
    logUpdate(`ERROR: ${err?.message || err}`);
    win.webContents.send("updater:status", {
      status: "error",
      message: err?.message || "Unknown error",
    });
  });

  // Initial check, then every 30 minutes
  logUpdate("Performing initial update check...");
  autoUpdater.checkForUpdates().catch((err) => {
    logUpdate(`Initial check failed: ${err?.message || err}`);
  });
  setInterval(() => {
    logUpdate("Periodic update check...");
    autoUpdater.checkForUpdates().catch((err) => {
      logUpdate(`Periodic check failed: ${err?.message || err}`);
    });
  }, 30 * 60 * 1000);
}

// ─── Static File Serving via Custom Protocol ─────────────────────────────────
function setupStaticServing() {
  const outDir = path.join(__dirname, "../out");

  // MIME types for static files
  const MIME_TYPES = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".map": "application/json",
    ".webmanifest": "application/manifest+json",
  };

  protocol.handle("app", (request) => {
    // Parse the URL path — app://./path or app://-/path
    const url = new URL(request.url);
    let filePath = decodeURIComponent(url.pathname);

    // Remove leading slash
    if (filePath.startsWith("/")) filePath = filePath.slice(1);

    // Default to index.html
    if (!filePath || filePath === "") filePath = "index.html";

    const fullPath = path.join(outDir, filePath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(outDir)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Try the exact file, then with .html extension
    let resolvedPath = fullPath;
    if (!fs.existsSync(resolvedPath)) {
      if (fs.existsSync(resolvedPath + ".html")) {
        resolvedPath = resolvedPath + ".html";
      } else if (
        fs.existsSync(path.join(resolvedPath, "index.html"))
      ) {
        resolvedPath = path.join(resolvedPath, "index.html");
      } else {
        // Fallback to index.html for SPA routing
        resolvedPath = path.join(outDir, "index.html");
      }
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    return net.fetch(`file://${resolvedPath}`, {
      headers: { "Content-Type": mimeType },
    });
  });
}

// ─── Window Creation ─────────────────────────────────────────────────────────
let mainWindow = null;

// Resolve app icon path (works in both dev and production)
function getAppIcon() {
  const iconName = process.platform === "win32" ? "icon.ico" : "icon.png";
  const devPath = path.join(__dirname, "../build", iconName);
  const prodPath = path.join(process.resourcesPath, "build", iconName);
  const iconPath = fs.existsSync(devPath) ? devPath : prodPath;
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return undefined;
}

async function createWindow() {
  const icon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: APP_NAME,
    icon,
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
    // In production, load via custom privileged protocol
    mainWindow.loadURL("app://./index.html");
  }

  setupAutoUpdater(mainWindow);

  // Set dock icon on macOS
  if (process.platform === "darwin" && icon) {
    app.dock.setIcon(icon);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getPlatform", () => process.platform);
ipcMain.handle("app:checkForUpdates", async () => {
  if (!isDev) {
    logUpdate("Manual update check triggered");
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, version: result?.updateInfo?.version };
    } catch (err) {
      logUpdate(`Manual check failed: ${err?.message || err}`);
      return { success: false, error: err?.message || "Unknown error" };
    }
  }
  return { success: false, error: "Auto-update disabled in dev mode" };
});

// ─── File Dialog & I/O Handlers ──────────────────────────────────────────────

// Show native save dialog
ipcMain.handle("dialog:save", async (_event, options) => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options?.title || "Save",
    defaultPath: options?.defaultPath || undefined,
    filters: options?.filters || [],
    properties: options?.properties || [],
  });
  return { canceled: result.canceled, filePath: result.filePath || null };
});

// Show native open dialog
ipcMain.handle("dialog:open", async (_event, options) => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || "Open",
    defaultPath: options?.defaultPath || undefined,
    filters: options?.filters || [],
    properties: options?.properties || ["openFile"],
  });
  return { canceled: result.canceled, filePaths: result.filePaths || [] };
});

// Write binary data to a file
ipcMain.handle("file:write", async (_event, filePath, data) => {
  try {
    await fs.promises.writeFile(filePath, Buffer.from(data));
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || "Write failed" };
  }
});

// Read binary data from a file
ipcMain.handle("file:read", async (_event, filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return { success: true, data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) };
  } catch (err) {
    return { success: false, error: err?.message || "Read failed" };
  }
});

// Write multiple files to a folder
ipcMain.handle("file:writeMultiple", async (_event, folderPath, files) => {
  try {
    // Ensure folder exists
    await fs.promises.mkdir(folderPath, { recursive: true });
    for (const file of files) {
      const fullPath = path.join(folderPath, file.name);
      // Ensure subdirectories exist
      const dir = path.dirname(fullPath);
      if (dir !== folderPath) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      await fs.promises.writeFile(fullPath, Buffer.from(file.data));
    }
    return { success: true, count: files.length };
  } catch (err) {
    return { success: false, error: err?.message || "Write failed" };
  }
});

// Set window title
ipcMain.handle("window:setTitle", (_event, title) => {
  if (mainWindow) mainWindow.setTitle(title);
});

// Show item in file manager / reveal in Finder
ipcMain.handle("shell:showItemInFolder", (_event, filePath) => {
  shell.showItemInFolder(filePath);
});

// ─── App Lifecycle ───────────────────────────────────────────────────────────
app.on("ready", () => {
  if (!isDev) setupStaticServing();
  createWindow();
});

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
    const appUrl = isDev ? "http://localhost:3000" : "app://";
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
});
