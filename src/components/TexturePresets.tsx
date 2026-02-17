"use client";

import React, { useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { TEXTURE_PRESETS, TexturePreset, MapType } from "@/types/maps";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Bookmark,
  Trash2,
  Clock,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ─── Custom Presets Storage ───────────────────────────────────────────────────
const STORAGE_KEY = "materialililil-presets";

interface SavedPreset {
  id: string;
  name: string;
  timestamp: number;
  params: Record<MapType, Record<string, unknown>>;
}

function loadPresets(): SavedPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresetsToStorage(presets: SavedPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES: { key: TexturePreset["category"]; label: string }[] = [
  { key: "hard", label: "Hard Surfaces" },
  { key: "reflective", label: "Reflective" },
  { key: "organic", label: "Organic & Natural" },
  { key: "soft", label: "Soft & Synthetic" },
];

export default function TexturePresets() {
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const applyTexturePreset = useAppStore((s) => s.applyTexturePreset);
  const generateAllMaps = useAppStore((s) => s.generateAllMaps);
  const generating = useAppStore((s) => s.generating);
  const updateMapParams = useAppStore((s) => s.updateMapParams);

  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  // Custom presets
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>(() => loadPresets());
  const [newName, setNewName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const handleApplyPreset = useCallback(
    async (preset: TexturePreset) => {
      applyTexturePreset(preset);
      setAppliedId(preset.id);
      setTimeout(() => setAppliedId(null), 2000);
      // Auto-regenerate if source exists
      if (sourceImageData) {
        // Small delay to let state settle
        setTimeout(() => {
          generateAllMaps();
        }, 50);
      }
    },
    [applyTexturePreset, sourceImageData, generateAllMaps]
  );

  const handleSaveCustom = useCallback(() => {
    if (!newName.trim()) return;
    const params: Record<string, Record<string, unknown>> = {};
    for (const [type, map] of Object.entries(maps)) {
      params[type] = { ...map.params } as Record<string, unknown>;
    }
    const preset: SavedPreset = {
      id: Date.now().toString(36),
      name: newName.trim(),
      timestamp: Date.now(),
      params: params as Record<MapType, Record<string, unknown>>,
    };
    const updated = [preset, ...customPresets].slice(0, 20);
    setCustomPresets(updated);
    savePresetsToStorage(updated);
    setNewName("");
    setShowSave(false);
  }, [newName, maps, customPresets]);

  const handleLoadCustom = useCallback(
    (preset: SavedPreset) => {
      for (const [type, params] of Object.entries(preset.params)) {
        updateMapParams(type as MapType, params as Record<string, number | boolean | string>);
      }
    },
    [updateMapParams]
  );

  const handleDeleteCustom = useCallback(
    (id: string) => {
      const updated = customPresets.filter((p) => p.id !== id);
      setCustomPresets(updated);
      savePresetsToStorage(updated);
    },
    [customPresets]
  );

  if (!sourceImageData) return null;

  return (
    <div className="space-y-4">
      {/* Material Presets */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Material Presets
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 -mt-1">
          One click to set optimal parameters for a material type, then regenerate all maps
        </p>

        {CATEGORIES.map((cat) => {
          const presets = TEXTURE_PRESETS.filter((p) => p.category === cat.key);
          if (presets.length === 0) return null;
          return (
            <div key={cat.key} className="space-y-1.5">
              <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
                {cat.label}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {presets.map((preset) => {
                  const isApplied = appliedId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      disabled={generating}
                      className={cn(
                        "flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border text-center transition-all",
                        isApplied
                          ? "border-green-600/50 bg-green-950/20"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      title={preset.description}
                    >
                      <span className="text-base leading-none">{preset.emoji}</span>
                      <span
                        className={cn(
                          "text-[10px] font-medium truncate w-full",
                          isApplied ? "text-green-400" : "text-zinc-300"
                        )}
                      >
                        {isApplied ? (
                          <span className="flex items-center justify-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Applied
                          </span>
                        ) : (
                          preset.name
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Presets */}
      <div className="border-t border-zinc-800 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCustom((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
          >
            {showCustom ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <Bookmark className="w-3.5 h-3.5" />
            Custom Presets
          </button>
          {showCustom && (
            <button
              onClick={() => setShowSave(!showSave)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {showSave ? "Cancel" : "+ Save Current"}
            </button>
          )}
        </div>

        {showCustom && (
          <div className="space-y-2">
            {showSave && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveCustom();
                  }}
                  placeholder="Preset name..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveCustom}
                  disabled={!newName.trim()}
                  className="px-2.5 py-1 rounded bg-amber-500 text-xs text-black hover:bg-amber-400 disabled:opacity-40 transition-colors"
                >
                  Save
                </button>
              </div>
            )}

            {customPresets.length === 0 ? (
              <p className="text-[10px] text-zinc-600 text-center py-2">
                No custom presets yet. Adjust your maps and save settings here.
              </p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                {customPresets.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 group transition-colors"
                  >
                    <button
                      onClick={() => handleLoadCustom(p)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-[11px] text-zinc-300 truncate group-hover:text-zinc-100 transition-colors">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1 text-[9px] text-zinc-600">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(p.timestamp).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteCustom(p.id)}
                      className="p-0.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
