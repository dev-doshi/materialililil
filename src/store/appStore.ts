import { create } from "zustand";
import { MapType, MapParams, GeneratedMap, getMapDefaults, TexturePreset, getDependentMaps } from "@/types/maps";
import { generateMap } from "@/engine/mapGenerators";
import { imageToImageData, imageDataToDataUrl, imageDataToBlob, downscaleImageData, upscaleImageData } from "@/engine/algorithms";
import { getElectronAPI } from "@/types/electron";
import { zipSync, unzipSync, strToU8 } from "fflate";

// ─── Constants ────────────────────────────────────────────────────────────────
const PROJECT_STORAGE_KEY = "materialililil-project";
const AUTOSAVE_STORAGE_KEY = "materialililil-autosave";
const MAX_HISTORY = 30;
const PROJECT_FILE_EXTENSION = "matlil";
const PROJECT_FILE_FILTER = { name: "materialililil Project", extensions: [PROJECT_FILE_EXTENSION] };
const IMAGE_FILE_FILTER = { name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] };
const PROJECT_FORMAT_VERSION = 2;

// ─── Types ────────────────────────────────────────────────────────────────────
interface HistoryEntry {
  maps: Record<MapType, { params: MapParams; generated: boolean }>;
}

export interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: number;
}

interface AppState {
  // Source image
  sourceImage: HTMLImageElement | null;
  sourceImageData: ImageData | null;
  sourceDataUrl: string | null;
  sourceFileName: string;
  sourceWidth: number;
  sourceHeight: number;

  // Generated maps
  maps: Record<MapType, GeneratedMap>;

  // Project state
  projectPath: string | null;
  isDirty: boolean;

  // UI state
  selectedMap: MapType | null;
  viewMode: "2d" | "3d" | "grid";
  showFullMaterial: boolean;
  generating: boolean;
  generatingMap: MapType | null;
  progress: number;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelTab: "thumbnails" | "tiling";
  rightPanelTab: "adjustments" | "generate" | "effects" | "inspect";
  liveUpdate: boolean;
  exportModalOpen: boolean;
  toasts: Toast[];

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setSourceImage: (file: File) => Promise<void>;
  generateSingleMap: (type: MapType, cascadeDeps?: boolean) => void;
  generateAllMaps: () => Promise<void>;
  generateSelectedMaps: (types: MapType[]) => Promise<void>;
  generateUngeneratedMaps: () => Promise<void>;
  updateMapParams: (type: MapType, params: Partial<MapParams>) => void;
  selectMap: (type: MapType | null) => void;
  setViewMode: (mode: "2d" | "3d" | "grid") => void;
  toggleFullMaterial: () => void;
  clearAllMaps: () => void;
  clearSingleMap: (type: MapType) => void;
  clearSource: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleLiveUpdate: () => void;
  setBottomPanelTab: (tab: "thumbnails" | "tiling") => void;
  applyTexturePreset: (preset: TexturePreset) => void;
  setRightPanelTab: (tab: "adjustments" | "generate" | "effects" | "inspect") => void;
  toggleMapEnabled: (type: MapType) => void;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  downloadMap: (type: MapType) => void;
  downloadAllMaps: () => void;
  copyParamsToAll: (sourceType: MapType) => void;
  resetAllParams: () => void;
  duplicateMap: (from: MapType, to: MapType) => void;
  // Project save/load
  saveProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  openProject: () => Promise<void>;
  // Export
  exportSingleMap: (type: MapType) => Promise<void>;
  setExportModalOpen: (open: boolean) => void;
  addToast: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  dismissToast: (id: string) => void;
  markDirty: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function createInitialMaps(): Record<MapType, GeneratedMap> {
  const maps = {} as Record<MapType, GeneratedMap>;
  for (const type of Object.values(MapType)) {
    maps[type] = {
      type,
      imageData: null,
      dataUrl: null,
      params: getMapDefaults(type),
      generating: false,
      generated: false,
      enabled: true,
    };
  }
  return maps;
}

let _toastCounter = 0;

// ─── Project File Helpers ────────────────────────────────────────────────────

/** Convert a dataURL to a Uint8Array of PNG bytes */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Convert an ImageData to PNG Uint8Array via canvas */
async function imageDataToPngBytes(imageData: ImageData): Promise<Uint8Array> {
  const blob = await imageDataToBlob(imageData, "image/png");
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

/** Build a .matlil project file (ZIP) and return as Uint8Array */
async function buildProjectFile(state: AppState): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};

  // Manifest
  const manifest = {
    version: PROJECT_FORMAT_VERSION,
    app: "materialililil",
    sourceFileName: state.sourceFileName,
    sourceWidth: state.sourceWidth,
    sourceHeight: state.sourceHeight,
    maps: {} as Record<string, { params: MapParams; enabled: boolean; generated: boolean }>,
  };

  for (const type of Object.values(MapType)) {
    const map = state.maps[type];
    manifest.maps[type] = {
      params: map.params,
      enabled: map.enabled,
      generated: map.generated,
    };
  }

  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));

  // Source image
  if (state.sourceDataUrl) {
    files["source.png"] = dataUrlToBytes(state.sourceDataUrl);
  }

  // Generated maps (save as PNG for instant load)
  for (const type of Object.values(MapType)) {
    const map = state.maps[type];
    if (map.generated && map.imageData) {
      files[`maps/${type}.png`] = await imageDataToPngBytes(map.imageData);
    }
  }

  return zipSync(files, { level: 6 });
}

/** Load a .matlil project file from a Uint8Array buffer */
async function loadProjectFile(
  buffer: Uint8Array,
  set: (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void,
  get: () => AppState
): Promise<boolean> {
  try {
    const unzipped = unzipSync(buffer);

    // Read manifest
    const manifestBytes = unzipped["manifest.json"];
    if (!manifestBytes) throw new Error("Invalid project file: missing manifest");
    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    if (!manifest.version || !manifest.sourceFileName) throw new Error("Invalid manifest");

    // Read source image
    const sourceBytes = unzipped["source.png"];
    if (!sourceBytes) throw new Error("Invalid project file: missing source image");

    // Convert source bytes to blob URL, then load as Image
    const sourceBlob = new Blob([sourceBytes.buffer as ArrayBuffer], { type: "image/png" });
    const sourceUrl = URL.createObjectURL(sourceBlob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        const imageData = imageToImageData(img, 2048);
        const maps = createInitialMaps();

        // Restore map params and enabled state
        for (const type of Object.values(MapType)) {
          if (manifest.maps[type]) {
            maps[type].params = { ...maps[type].params, ...manifest.maps[type].params };
            maps[type].enabled = manifest.maps[type].enabled ?? true;
          }
        }

        // Load generated map images
        const mapLoadPromises: Promise<void>[] = [];
        for (const type of Object.values(MapType)) {
          const mapBytes = unzipped[`maps/${type}.png`];
          if (mapBytes && manifest.maps[type]?.generated) {
            mapLoadPromises.push(
              new Promise((mapResolve) => {
                const mapBlob = new Blob([mapBytes.buffer as ArrayBuffer], { type: "image/png" });
                const mapUrl = URL.createObjectURL(mapBlob);
                const mapImg = new Image();
                mapImg.onload = () => {
                  const canvas = document.createElement("canvas");
                  canvas.width = mapImg.width;
                  canvas.height = mapImg.height;
                  const ctx = canvas.getContext("2d")!;
                  ctx.drawImage(mapImg, 0, 0);
                  const mapImageData = ctx.getImageData(0, 0, mapImg.width, mapImg.height);
                  const mapDataUrl = imageDataToDataUrl(mapImageData);
                  maps[type].imageData = mapImageData;
                  maps[type].dataUrl = mapDataUrl;
                  maps[type].generated = true;
                  URL.revokeObjectURL(mapUrl);
                  mapResolve();
                };
                mapImg.onerror = () => {
                  URL.revokeObjectURL(mapUrl);
                  mapResolve(); // Skip failed maps silently
                };
                mapImg.src = mapUrl;
              })
            );
          }
        }

        await Promise.all(mapLoadPromises);

        // Convert source blob URL to dataURL for storage
        const reader = new FileReader();
        reader.onload = () => {
          const sourceDataUrl = reader.result as string;
          URL.revokeObjectURL(sourceUrl);

          set({
            sourceImage: img,
            sourceImageData: imageData,
            sourceDataUrl: sourceDataUrl,
            sourceFileName: manifest.sourceFileName || "restored",
            sourceWidth: manifest.sourceWidth || img.naturalWidth,
            sourceHeight: manifest.sourceHeight || img.naturalHeight,
            maps,
            selectedMap: MapType.Height,
            isDirty: false,
            history: [],
            historyIndex: -1,
          });

          // Update window title
          updateWindowTitle(get().projectPath, manifest.sourceFileName, false);
          get().addToast("Project opened", "success");
          resolve(true);
        };
        reader.readAsDataURL(sourceBlob);
      };
      img.onerror = () => {
        URL.revokeObjectURL(sourceUrl);
        get().addToast("Failed to load project source image", "error");
        resolve(false);
      };
      img.src = sourceUrl;
    });
  } catch (err) {
    console.error("Failed to load project:", err);
    get().addToast(`Failed to load project: ${(err as Error).message}`, "error");
    return false;
  }
}

/** Update window title with project name and dirty state */
function updateWindowTitle(projectPath: string | null, fileName: string, isDirty: boolean) {
  const api = getElectronAPI();
  if (!api) return;
  const name = projectPath
    ? projectPath.split("/").pop()?.split("\\").pop()?.replace(`.${PROJECT_FILE_EXTENSION}`, "") || fileName
    : fileName || "Untitled";
  const dirty = isDirty ? " •" : "";
  api.setWindowTitle(`${name}${dirty} — materialililil`);
}

/** Auto-save project params to localStorage as crash recovery */
function autoSaveToLocalStorage(state: AppState) {
  try {
    const data = {
      version: 1,
      sourceFileName: state.sourceFileName,
      sourceWidth: state.sourceWidth,
      sourceHeight: state.sourceHeight,
      sourceDataUrl: state.sourceDataUrl,
      projectPath: state.projectPath,
      maps: {} as Record<string, { params: MapParams; enabled: boolean; generated: boolean; dataUrl: string | null }>,
    };
    for (const type of Object.values(MapType)) {
      const map = state.maps[type];
      data.maps[type] = {
        params: map.params,
        enabled: map.enabled,
        generated: map.generated,
        dataUrl: map.dataUrl,
      };
    }
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Silent fail — localStorage may be full
  }
}

// Progressive rendering: version tracking & timer management
const _genVersions: Record<string, number> = {};
const _fullResTimers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
let _cascadeTimer: ReturnType<typeof setTimeout> | undefined;

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>((set, get) => ({
  sourceImage: null,
  sourceImageData: null,
  sourceDataUrl: null,
  sourceFileName: "",
  sourceWidth: 0,
  sourceHeight: 0,
  maps: createInitialMaps(),
  projectPath: null,
  isDirty: false,
  selectedMap: null,
  viewMode: "2d",
  showFullMaterial: false,
  generating: false,
  generatingMap: null,
  progress: 0,
  leftPanelOpen: true,
  rightPanelOpen: true,
  bottomPanelTab: "thumbnails",
  rightPanelTab: "adjustments",
  liveUpdate: true,
  exportModalOpen: false,
  toasts: [],
  history: [],
  historyIndex: -1,

  setSourceImage: async (file: File) => {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const imageData = imageToImageData(img, 2048);
          set({
            sourceImage: img,
            sourceImageData: imageData,
            sourceDataUrl: e.target?.result as string,
            sourceFileName: file.name,
            sourceWidth: img.naturalWidth,
            sourceHeight: img.naturalHeight,
            maps: createInitialMaps(),
            selectedMap: MapType.Height,
            projectPath: null,
            isDirty: true,
          });
          updateWindowTitle(null, file.name, true);
          get().addToast(`Loaded ${file.name} (${img.naturalWidth}×${img.naturalHeight})`, "success");
          resolve();
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  },

  generateSingleMap: (type: MapType, cascadeDeps = true) => {
    const state = get();
    if (!state.sourceImageData) return;
    if (!state.maps[type].enabled) return;

    const version = (_genVersions[type] = (_genVersions[type] || 0) + 1);
    if (_fullResTimers[type]) { clearTimeout(_fullResTimers[type]); _fullResTimers[type] = undefined; }

    set((s) => ({
      maps: { ...s.maps, [type]: { ...s.maps[type], generating: true } },
      generatingMap: type,
    }));

    const { width, height } = state.sourceImageData;
    const maxDim = Math.max(width, height);
    const useProgressive = maxDim > 512;

    requestAnimationFrame(() => {
      if (_genVersions[type] !== version) return;
      const currentState = get();
      if (!currentState.sourceImageData) return;
      const params = currentState.maps[type].params;

      try {
        if (useProgressive) {
          const scale = Math.ceil(maxDim / 512);
          const previewSource = downscaleImageData(currentState.sourceImageData, scale);
          const previewResult = generateMap(type, previewSource, params);
          const upscaled = upscaleImageData(previewResult, width, height);
          const previewUrl = imageDataToDataUrl(upscaled);

          if (_genVersions[type] !== version) return;
          set((s) => ({
            maps: { ...s.maps, [type]: { ...s.maps[type], dataUrl: previewUrl, generated: true } },
          }));
        }

        const finalize = () => {
          requestAnimationFrame(() => {
            if (_genVersions[type] !== version) return;
            const latest = get();
            if (!latest.sourceImageData) return;

            try {
              const imageData = generateMap(type, latest.sourceImageData, latest.maps[type].params);
              const dataUrl = imageDataToDataUrl(imageData);
              if (_genVersions[type] !== version) return;

              set((s) => ({
                maps: {
                  ...s.maps,
                  [type]: { ...s.maps[type], imageData, dataUrl, generating: false, generated: true },
                },
                generatingMap: s.generatingMap === type ? null : s.generatingMap,
              }));
              get().saveHistory();

              // Dependency cascade
              if (cascadeDeps) {
                const dependents = getDependentMaps(type);
                const generated = dependents.filter((dep) => {
                  const depMap = get().maps[dep];
                  return depMap.generated && depMap.enabled;
                });
                if (generated.length > 0) {
                  if (_cascadeTimer) clearTimeout(_cascadeTimer);
                  _cascadeTimer = setTimeout(() => {
                    for (const dep of generated) {
                      get().generateSingleMap(dep, false);
                    }
                  }, 200);
                }
              }
            } catch (err) {
              console.error(`Error generating ${type} map:`, err);
              set((s) => ({
                maps: { ...s.maps, [type]: { ...s.maps[type], generating: false } },
                generatingMap: s.generatingMap === type ? null : s.generatingMap,
              }));
            }
          });
        };

        if (useProgressive) {
          _fullResTimers[type] = setTimeout(finalize, 50);
        } else {
          finalize();
        }
      } catch (err) {
        console.error(`Error generating ${type} preview:`, err);
        set((s) => ({
          maps: { ...s.maps, [type]: { ...s.maps[type], generating: false } },
          generatingMap: null,
        }));
      }
    });
  },

  generateAllMaps: async () => {
    const state = get();
    if (!state.sourceImageData) return;

    for (const type of Object.values(MapType)) {
      _genVersions[type] = (_genVersions[type] || 0) + 1;
      if (_fullResTimers[type]) { clearTimeout(_fullResTimers[type]); _fullResTimers[type] = undefined; }
    }

    set({ generating: true, progress: 0 });

    const types = Object.values(MapType).filter((t) => state.maps[t].enabled);
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      set((s) => ({
        maps: { ...s.maps, [type]: { ...s.maps[type], generating: true } },
        generatingMap: type,
        progress: Math.round((i / types.length) * 100),
      }));

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          const currentState = get();
          if (!currentState.sourceImageData) { resolve(); return; }
          try {
            const imageData = generateMap(type, currentState.sourceImageData, currentState.maps[type].params);
            const dataUrl = imageDataToDataUrl(imageData);
            set((s) => ({
              maps: {
                ...s.maps,
                [type]: { ...s.maps[type], imageData, dataUrl, generating: false, generated: true },
              },
            }));
          } catch (err) {
            console.error(`Error generating ${type} map:`, err);
            set((s) => ({
              maps: { ...s.maps, [type]: { ...s.maps[type], generating: false } },
            }));
          }
          resolve();
        });
      });
    }

    set({ generating: false, generatingMap: null, progress: 100 });
    get().saveHistory();
  },

  generateSelectedMaps: async (types: MapType[]) => {
    const state = get();
    if (!state.sourceImageData || types.length === 0) return;

    for (const type of types) {
      _genVersions[type] = (_genVersions[type] || 0) + 1;
      if (_fullResTimers[type]) { clearTimeout(_fullResTimers[type]); _fullResTimers[type] = undefined; }
    }

    set({ generating: true, progress: 0 });

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      set((s) => ({
        maps: { ...s.maps, [type]: { ...s.maps[type], generating: true } },
        generatingMap: type,
        progress: Math.round((i / types.length) * 100),
      }));

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          const currentState = get();
          if (!currentState.sourceImageData) { resolve(); return; }
          try {
            const imageData = generateMap(type, currentState.sourceImageData, currentState.maps[type].params);
            const dataUrl = imageDataToDataUrl(imageData);
            set((s) => ({
              maps: { ...s.maps, [type]: { ...s.maps[type], imageData, dataUrl, generating: false, generated: true } },
            }));
          } catch (err) {
            console.error(`Error generating ${type} map:`, err);
            set((s) => ({
              maps: { ...s.maps, [type]: { ...s.maps[type], generating: false } },
            }));
          }
          resolve();
        });
      });
    }

    set({ generating: false, generatingMap: null, progress: 100 });
    get().saveHistory();
  },

  generateUngeneratedMaps: async () => {
    const state = get();
    const ungenerated = Object.values(MapType).filter((t) => !state.maps[t].generated && state.maps[t].enabled);
    if (ungenerated.length === 0) return;
    await get().generateSelectedMaps(ungenerated);
  },

  updateMapParams: (type: MapType, params: Partial<MapParams>) => {
    set((s) => ({
      maps: {
        ...s.maps,
        [type]: {
          ...s.maps[type],
          params: { ...s.maps[type].params, ...params },
        },
      },
    }));
  },

  selectMap: (type: MapType | null) => set({ selectedMap: type }),
  setViewMode: (mode: "2d" | "3d" | "grid") => set({ viewMode: mode }),
  toggleFullMaterial: () => set((s) => ({ showFullMaterial: !s.showFullMaterial, viewMode: "3d" })),

  toggleMapEnabled: (type: MapType) => {
    set((s) => ({
      maps: {
        ...s.maps,
        [type]: { ...s.maps[type], enabled: !s.maps[type].enabled },
      },
    }));
  },

  clearAllMaps: () => {
    const state = get();
    const newMaps = createInitialMaps();
    for (const type of Object.values(MapType)) {
      newMaps[type].enabled = state.maps[type].enabled;
    }
    set({ maps: newMaps, selectedMap: null, showFullMaterial: false });
  },

  clearSingleMap: (type: MapType) => {
    const freshMaps = createInitialMaps();
    set((s) => ({
      maps: {
        ...s.maps,
        [type]: { ...freshMaps[type], enabled: s.maps[type].enabled },
      },
    }));
    get().saveHistory();
  },

  clearSource: () => {
    set({
      sourceImage: null,
      sourceImageData: null,
      sourceDataUrl: null,
      sourceFileName: "",
      sourceWidth: 0,
      sourceHeight: 0,
      maps: createInitialMaps(),
      selectedMap: null,
      showFullMaterial: false,
      generating: false,
      generatingMap: null,
      progress: 0,
      history: [],
      historyIndex: -1,
      projectPath: null,
      isDirty: false,
    });
    updateWindowTitle(null, "", false);
  },

  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleLiveUpdate: () => set((s) => ({ liveUpdate: !s.liveUpdate })),
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  applyTexturePreset: (preset: TexturePreset) => {
    const state = get();
    const newMaps = createInitialMaps();
    for (const [type, presetParams] of Object.entries(preset.params)) {
      const mapType = type as MapType;
      newMaps[mapType].params = { ...newMaps[mapType].params, ...presetParams } as MapParams;
    }
    for (const type of Object.values(MapType)) {
      newMaps[type].imageData = state.maps[type].imageData;
      newMaps[type].dataUrl = state.maps[type].dataUrl;
      newMaps[type].generated = state.maps[type].generated;
      newMaps[type].generating = state.maps[type].generating;
      newMaps[type].enabled = state.maps[type].enabled;
    }
    set({ maps: newMaps });
    get().saveHistory();
  },

  undo: () => {
    const { history, historyIndex, sourceImageData } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const entry = history[newIndex];
    const currentMaps = get().maps;
    const restoredMaps = { ...currentMaps };

    for (const [type, data] of Object.entries(entry.maps)) {
      restoredMaps[type as MapType] = {
        ...restoredMaps[type as MapType],
        params: data.params,
        generated: data.generated,
        imageData: null,
        dataUrl: null,
      };
    }
    set({ maps: restoredMaps, historyIndex: newIndex });

    if (sourceImageData) {
      const toRegenerate = Object.entries(entry.maps)
        .filter(([, data]) => data.generated)
        .map(([type]) => type as MapType);
      if (toRegenerate.length > 0) {
        get().generateSelectedMaps(toRegenerate);
      }
    }
  },

  redo: () => {
    const { history, historyIndex, sourceImageData } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const entry = history[newIndex];
    const currentMaps = get().maps;
    const restoredMaps = { ...currentMaps };

    for (const [type, data] of Object.entries(entry.maps)) {
      restoredMaps[type as MapType] = {
        ...restoredMaps[type as MapType],
        params: data.params,
        generated: data.generated,
        imageData: null,
        dataUrl: null,
      };
    }
    set({ maps: restoredMaps, historyIndex: newIndex });

    if (sourceImageData) {
      const toRegenerate = Object.entries(entry.maps)
        .filter(([, data]) => data.generated)
        .map(([type]) => type as MapType);
      if (toRegenerate.length > 0) {
        get().generateSelectedMaps(toRegenerate);
      }
    }
  },

  saveHistory: () => {
    const { maps, history, historyIndex } = get();
    const entry: HistoryEntry = {
      maps: {} as HistoryEntry["maps"],
    };
    for (const [type, map] of Object.entries(maps)) {
      entry.maps[type as MapType] = {
        params: { ...map.params },
        generated: map.generated,
      };
    }
    const newHistory = [...history.slice(0, historyIndex + 1), entry].slice(-MAX_HISTORY);
    set({ history: newHistory, historyIndex: newHistory.length - 1 });

    // Mark project as dirty on every history-saving change
    get().markDirty();
  },

  downloadMap: (type: MapType) => {
    const state = get();
    const map = state.maps[type];
    if (!map.dataUrl) return;

    const api = getElectronAPI();
    if (api) {
      // In Electron, use native save dialog
      get().exportSingleMap(type);
    } else {
      // Browser fallback: anchor click
      const a = document.createElement("a");
      a.href = map.dataUrl;
      a.download = `${state.sourceFileName.replace(/\.[^.]+$/, "")}_${type}.png`;
      a.click();
    }
  },

  downloadAllMaps: () => {
    const state = get();
    const api = getElectronAPI();
    if (api) {
      // In Electron, not used — ExportModal handles everything
      get().addToast("Use Export (⌘E) to export all maps", "info");
    } else {
      // Browser fallback
      const generated = Object.values(MapType).filter((t) => state.maps[t].generated && state.maps[t].dataUrl);
      if (generated.length === 0) return;
      generated.forEach((type, i) => {
        setTimeout(() => get().downloadMap(type), i * 200);
      });
    }
  },

  copyParamsToAll: (sourceType: MapType) => {
    const state = get();
    const sourceParams = state.maps[sourceType].params;
    const commonKeys = ['intensity', 'contrast', 'brightness', 'blur', 'sharpen', 'invert', 'blackPoint', 'whitePoint', 'gamma'];
    const commonParams: Partial<MapParams> = {};
    for (const key of commonKeys) {
      if (key in sourceParams) {
        (commonParams as Record<string, unknown>)[key] = sourceParams[key];
      }
    }
    const newMaps = { ...state.maps };
    for (const type of Object.values(MapType)) {
      if (type !== sourceType) {
        newMaps[type] = {
          ...newMaps[type],
          params: { ...newMaps[type].params, ...commonParams } as MapParams,
        };
      }
    }
    set({ maps: newMaps });
    get().saveHistory();
  },

  resetAllParams: () => {
    const state = get();
    const newMaps = createInitialMaps();
    for (const type of Object.values(MapType)) {
      newMaps[type].imageData = state.maps[type].imageData;
      newMaps[type].dataUrl = state.maps[type].dataUrl;
      newMaps[type].generated = state.maps[type].generated;
      newMaps[type].generating = state.maps[type].generating;
      newMaps[type].enabled = state.maps[type].enabled;
    }
    set({ maps: newMaps });
    get().saveHistory();
  },

  duplicateMap: (from: MapType, to: MapType) => {
    const state = get();
    const sourceMap = state.maps[from];
    if (!sourceMap.generated || !sourceMap.dataUrl) return;
    set((s) => ({
      maps: {
        ...s.maps,
        [to]: { ...s.maps[to], imageData: sourceMap.imageData, dataUrl: sourceMap.dataUrl, generated: true },
      },
    }));
    get().saveHistory();
  },

  saveProject: async () => {
    const state = get();
    if (!state.sourceImageData) return;

    const api = getElectronAPI();

    if (api) {
      // Electron: save to current path, or show Save As if new
      if (state.projectPath) {
        try {
          const projectData = await buildProjectFile(state);
          const result = await api.writeFile(state.projectPath, projectData.buffer.slice(projectData.byteOffset, projectData.byteOffset + projectData.byteLength) as ArrayBuffer);
          if (result.success) {
            set({ isDirty: false });
            updateWindowTitle(state.projectPath, state.sourceFileName, false);
            get().addToast("Project saved", "success");
          } else {
            get().addToast(`Save failed: ${result.error}`, "error");
          }
        } catch (err) {
          get().addToast(`Save failed: ${(err as Error).message}`, "error");
        }
      } else {
        // No existing path — show Save As
        await get().saveProjectAs();
      }
    } else {
      // Browser fallback: download as .matlil file
      try {
        const projectData = await buildProjectFile(state);
        const blob = new Blob([projectData.buffer as ArrayBuffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${state.sourceFileName.replace(/\.[^.]+$/, "") || "project"}.${PROJECT_FILE_EXTENSION}`;
        a.click();
        URL.revokeObjectURL(url);
        set({ isDirty: false });
        get().addToast("Project downloaded", "success");
      } catch (err) {
        get().addToast(`Save failed: ${(err as Error).message}`, "error");
      }
    }

    // Also auto-save to localStorage
    autoSaveToLocalStorage(get());
  },

  saveProjectAs: async () => {
    const state = get();
    if (!state.sourceImageData) return;

    const api = getElectronAPI();

    if (api) {
      const defaultName = `${state.sourceFileName.replace(/\.[^.]+$/, "") || "project"}.${PROJECT_FILE_EXTENSION}`;
      const dialogResult = await api.showSaveDialog({
        title: "Save Project As",
        defaultPath: defaultName,
        filters: [PROJECT_FILE_FILTER],
      });

      if (dialogResult.canceled || !dialogResult.filePath) return;

      try {
        const projectData = await buildProjectFile(state);
        const result = await api.writeFile(
          dialogResult.filePath,
          projectData.buffer.slice(projectData.byteOffset, projectData.byteOffset + projectData.byteLength) as ArrayBuffer
        );
        if (result.success) {
          set({ projectPath: dialogResult.filePath, isDirty: false });
          updateWindowTitle(dialogResult.filePath, state.sourceFileName, false);
          get().addToast("Project saved", "success");
        } else {
          get().addToast(`Save failed: ${result.error}`, "error");
        }
      } catch (err) {
        get().addToast(`Save failed: ${(err as Error).message}`, "error");
      }
    } else {
      // Browser: same as saveProject
      await get().saveProject();
    }
  },

  openProject: async () => {
    const api = getElectronAPI();

    if (api) {
      const dialogResult = await api.showOpenDialog({
        title: "Open Project",
        filters: [PROJECT_FILE_FILTER, { name: "All Files", extensions: ["*"] }],
        properties: ["openFile"],
      });

      if (dialogResult.canceled || dialogResult.filePaths.length === 0) return;

      const filePath = dialogResult.filePaths[0];
      const fileResult = await api.readFile(filePath);

      if (!fileResult.success || !fileResult.data) {
        get().addToast(`Failed to read file: ${fileResult.error}`, "error");
        return;
      }

      const buffer = new Uint8Array(fileResult.data);
      set({ projectPath: filePath });
      await loadProjectFile(buffer, set, get);
    } else {
      // Browser fallback: file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = `.${PROJECT_FILE_EXTENSION}`;
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          set({ projectPath: null });
          await loadProjectFile(buffer, set, get);
        } catch (err) {
          get().addToast(`Failed to open project: ${(err as Error).message}`, "error");
        }
      };
      input.click();
    }
  },

  exportSingleMap: async (type: MapType) => {
    const state = get();
    const map = state.maps[type];
    if (!map.imageData) return;

    const api = getElectronAPI();
    const baseName = state.sourceFileName.replace(/\.[^.]+$/, "") || "texture";

    if (api) {
      const dialogResult = await api.showSaveDialog({
        title: `Export ${type} Map`,
        defaultPath: `${baseName}_${type}.png`,
        filters: [IMAGE_FILE_FILTER],
      });

      if (dialogResult.canceled || !dialogResult.filePath) return;

      try {
        const ext = dialogResult.filePath.toLowerCase().endsWith(".jpg") || dialogResult.filePath.toLowerCase().endsWith(".jpeg")
          ? "image/jpeg" : "image/png";
        const blob = await imageDataToBlob(map.imageData, ext);
        const buffer = await blob.arrayBuffer();
        const result = await api.writeFile(dialogResult.filePath, buffer);
        if (result.success) {
          get().addToast(`Exported ${type} map`, "success");
        } else {
          get().addToast(`Export failed: ${result.error}`, "error");
        }
      } catch (err) {
        get().addToast(`Export failed: ${(err as Error).message}`, "error");
      }
    } else {
      // Browser fallback
      const a = document.createElement("a");
      a.href = map.dataUrl!;
      a.download = `${baseName}_${type}.png`;
      a.click();
      get().addToast(`Downloaded ${type} map`, "success");
    }
  },

  markDirty: () => {
    const state = get();
    if (!state.isDirty) {
      set({ isDirty: true });
      updateWindowTitle(state.projectPath, state.sourceFileName, true);
    }
  },

  setExportModalOpen: (open: boolean) => {
    set({ exportModalOpen: open });
  },

  addToast: (message, type = "info") => {
    const id = `toast-${++_toastCounter}-${Date.now()}`;
    const toast: Toast = { id, message, type, timestamp: Date.now() };
    set((s) => ({ toasts: [...s.toasts.slice(-4), toast] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
