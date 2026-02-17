"use client";

import React, { useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS, MapType } from "@/types/maps";
import { cn } from "@/lib/utils";
import { Grid2X2, Download, RefreshCw, Trash2, DownloadCloud, Eye, EyeOff } from "lucide-react";

export default function MapComparisonGrid() {
  const maps = useAppStore((s) => s.maps);
  const selectMap = useAppStore((s) => s.selectMap);
  const sourceDataUrl = useAppStore((s) => s.sourceDataUrl);
  const selectedMap = useAppStore((s) => s.selectedMap);
  const generateSingleMap = useAppStore((s) => s.generateSingleMap);
  const downloadMap = useAppStore((s) => s.downloadMap);
  const clearSingleMap = useAppStore((s) => s.clearSingleMap);
  const downloadAllMaps = useAppStore((s) => s.downloadAllMaps);
  const setViewMode = useAppStore((s) => s.setViewMode);

  const [showSource, setShowSource] = useState(true);
  const [showUngenerated, setShowUngenerated] = useState(false);

  const generatedMaps = useMemo(
    () => MAP_CONFIGS.filter((c) => maps[c.type]?.generated),
    [maps]
  );

  const ungeneratedMaps = useMemo(
    () => MAP_CONFIGS.filter((c) => !maps[c.type]?.generated),
    [maps]
  );

  if (generatedMaps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No maps generated yet. Generate maps to see the comparison grid.
      </div>
    );
  }

  const allItems: { type: MapType | null; label: string; dataUrl: string | null; color: string; generated: boolean }[] = [];

  if (showSource) {
    allItems.push({ type: null, label: "Source", dataUrl: sourceDataUrl, color: "#3b82f6", generated: true });
  }

  generatedMaps.forEach((c) => {
    allItems.push({
      type: c.type,
      label: c.label.replace(" Map", ""),
      dataUrl: maps[c.type]?.dataUrl || null,
      color: c.color,
      generated: true,
    });
  });

  if (showUngenerated) {
    ungeneratedMaps.forEach((c) => {
      allItems.push({
        type: c.type,
        label: c.label.replace(" Map", ""),
        dataUrl: null,
        color: c.color,
        generated: false,
      });
    });
  }

  const cols = allItems.length <= 4 ? 2 : allItems.length <= 9 ? 3 : 4;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Grid2X2 className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-300">
            Comparison Grid — {generatedMaps.length} maps
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSource((v) => !v)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors",
              showSource ? "text-amber-300 bg-amber-500/10" : "text-zinc-500 hover:text-zinc-300"
            )}
            title="Toggle source image"
          >
            {showSource ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Source
          </button>
          <button
            onClick={() => setShowUngenerated((v) => !v)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors",
              showUngenerated ? "text-amber-300 bg-amber-600/10" : "text-zinc-500 hover:text-zinc-300"
            )}
            title="Show empty slots for ungenerated maps"
          >
            {showUngenerated ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Empty
          </button>
          <button
            onClick={downloadAllMaps}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Download all generated maps"
          >
            <DownloadCloud className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div
        className="flex-1 grid gap-0.5 p-0.5 overflow-auto bg-zinc-800"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {allItems.map((item) => (
          <div
            key={item.label}
            role="button"
            tabIndex={0}
            onClick={() => {
              selectMap(item.type);
              if (item.type !== null) setViewMode("2d");
            }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectMap(item.type); if (item.type !== null) setViewMode("2d"); } }}
            className={cn(
              "relative group overflow-hidden bg-zinc-950 cursor-pointer",
              selectedMap === item.type && "ring-2 ring-amber-500"
            )}
          >
            {item.dataUrl ? (
              <img
                src={item.dataUrl}
                alt={item.label}
                className="w-full h-full object-cover aspect-square"
              />
            ) : (
              <div className="w-full h-full aspect-square flex items-center justify-center bg-zinc-900">
                <span className="text-xs text-zinc-600">{item.generated ? "No data" : item.label}</span>
              </div>
            )}

            {/* Label + quick action overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-5 pb-1.5 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-white">{item.label}</span>
                {item.type !== null && item.generated && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadMap(item.type!); }}
                      className="p-0.5 rounded bg-zinc-800/60 text-zinc-300 hover:text-amber-400 transition"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); generateSingleMap(item.type!); }}
                      className="p-0.5 rounded bg-zinc-800/60 text-zinc-300 hover:text-amber-400 transition"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearSingleMap(item.type!); }}
                      className="p-0.5 rounded bg-zinc-800/60 text-zinc-300 hover:text-red-400 transition"
                      title="Clear"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {item.type !== null && !item.generated && (
                  <button
                    onClick={(e) => { e.stopPropagation(); generateSingleMap(item.type!); }}
                    className="px-1.5 py-0.5 rounded bg-amber-500/80 text-black text-[9px] hover:bg-amber-400 transition"
                  >
                    Generate
                  </button>
                )}
              </div>
            </div>

            <div
              className="absolute top-1 left-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
