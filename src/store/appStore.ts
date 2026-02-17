import { create } from "zustand";
import { MapType, MapParams, GeneratedMap, getMapDefaults, TexturePreset, getDependentMaps } from "@/types/maps";
import { generateMap } from "@/engine/mapGenerators";
import { imageToImageData, imageDataToDataUrl, downscaleImageData, upscaleImageData } from "@/engine/algorithms";

// ─── Constants ────────────────────────────────────────────────────────────────
const PROJECT_STORAGE_KEY = "materialililil-project";
const MAX_HISTORY = 30;

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
  saveProject: () => void;
  loadProject: () => boolean;
  addToast: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  dismissToast: (id: string) => void;
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
          });
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
    });
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
  },

  downloadMap: (type: MapType) => {
    const map = get().maps[type];
    if (!map.dataUrl) return;
    const a = document.createElement("a");
    a.href = map.dataUrl;
    a.download = `${get().sourceFileName.replace(/\.[^.]+$/, "")}_${type}.png`;
    a.click();
  },

  downloadAllMaps: () => {
    const state = get();
    const generated = Object.values(MapType).filter((t) => state.maps[t].generated && state.maps[t].dataUrl);
    if (generated.length === 0) return;
    generated.forEach((type, i) => {
      setTimeout(() => get().downloadMap(type), i * 200);
    });
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

  saveProject: () => {
    const state = get();
    try {
      const project = {
        version: 1,
        sourceFileName: state.sourceFileName,
        sourceWidth: state.sourceWidth,
        sourceHeight: state.sourceHeight,
        sourceDataUrl: state.sourceDataUrl,
        maps: {} as Record<string, { params: MapParams; enabled: boolean; generated: boolean; dataUrl: string | null }>,
      };
      for (const type of Object.values(MapType)) {
        const map = state.maps[type];
        project.maps[type] = {
          params: map.params,
          enabled: map.enabled,
          generated: map.generated,
          dataUrl: map.dataUrl,
        };
      }
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
      get().addToast("Project saved to browser storage", "success");
    } catch (err) {
      console.error("Failed to save project:", err);
      get().addToast("Failed to save — storage may be full", "error");
    }
  },

  loadProject: () => {
    try {
      const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
      if (!raw) return false;
      const project = JSON.parse(raw);
      if (!project.version || !project.sourceDataUrl) return false;

      const img = new Image();
      img.onload = () => {
        const imageData = imageToImageData(img, 2048);
        const maps = createInitialMaps();
        for (const type of Object.values(MapType)) {
          if (project.maps[type]) {
            maps[type].params = { ...maps[type].params, ...project.maps[type].params };
            maps[type].enabled = project.maps[type].enabled ?? true;
            maps[type].generated = project.maps[type].generated ?? false;
            maps[type].dataUrl = project.maps[type].dataUrl ?? null;
          }
        }
        set({
          sourceImage: img,
          sourceImageData: imageData,
          sourceDataUrl: project.sourceDataUrl,
          sourceFileName: project.sourceFileName || "restored",
          sourceWidth: project.sourceWidth || img.naturalWidth,
          sourceHeight: project.sourceHeight || img.naturalHeight,
          maps,
          selectedMap: MapType.Height,
        });
        get().addToast("Project restored", "success");
      };
      img.src = project.sourceDataUrl;
      return true;
    } catch (err) {
      console.error("Failed to load project:", err);
      return false;
    }
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
