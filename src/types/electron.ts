/**
 * Type declarations for the Electron preload bridge (window.electronAPI).
 * These types mirror the API exposed in electron/preload.js.
 */

export interface DialogFilter {
  name: string;
  extensions: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: DialogFilter[];
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: DialogFilter[];
  properties?: Array<"openFile" | "openDirectory" | "multiSelections">;
}

export interface SaveDialogResult {
  canceled: boolean;
  filePath: string | null;
}

export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface FileWriteResult {
  success: boolean;
  error?: string;
}

export interface FileReadResult {
  success: boolean;
  data?: ArrayBuffer;
  error?: string;
}

export interface FileWriteMultipleResult {
  success: boolean;
  count?: number;
  error?: string;
}

export interface FileEntry {
  name: string;
  data: ArrayBuffer;
}

export interface UpdaterStatusData {
  status: "checking" | "available" | "downloading" | "downloaded" | "up-to-date" | "error";
  version?: string;
  percent?: number;
  message?: string;
  releaseDate?: string;
}

export interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;

  // Updates
  checkForUpdates: () => Promise<{ success: boolean; version?: string; error?: string }>;
  onUpdaterStatus: (callback: (data: UpdaterStatusData) => void) => () => void;

  // File dialogs
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>;

  // File I/O
  writeFile: (filePath: string, data: ArrayBuffer) => Promise<FileWriteResult>;
  readFile: (filePath: string) => Promise<FileReadResult>;
  writeFiles: (folderPath: string, files: FileEntry[]) => Promise<FileWriteMultipleResult>;

  // Window
  setWindowTitle: (title: string) => Promise<void>;

  // Shell
  showItemInFolder: (filePath: string) => Promise<void>;
}

/**
 * Get the Electron API if available (returns undefined in browser).
 */
export function getElectronAPI(): ElectronAPI | undefined {
  if (typeof window !== "undefined") {
    return (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
  }
  return undefined;
}

/**
 * Check if running inside Electron.
 */
export function isElectron(): boolean {
  return getElectronAPI() !== undefined;
}
