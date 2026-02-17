"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS, MapType } from "@/types/maps";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Download,
  RefreshCw,
  Trash2,
  Wand2,
  Check,
  DownloadCloud,
  X,
} from "lucide-react";

// ─── Thumbnail context menu ──────────────────────────────────────────────────
function ThumbnailContextMenu({
  type,
  x,
  y,
  onClose,
}: {
  type: MapType;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const maps = useAppStore((s) => s.maps);
  const generateSingleMap = useAppStore((s) => s.generateSingleMap);
  const downloadMap = useAppStore((s) => s.downloadMap);
  const clearSingleMap = useAppStore((s) => s.clearSingleMap);
  const selectMap = useAppStore((s) => s.selectMap);

  const map = maps[type];
  const config = MAP_CONFIGS.find((c) => c.type === type)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: x, top: y, zIndex: 9999 }}
      className="min-w-[160px] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1"
    >
      <div className="px-3 py-1.5 text-[10px] text-zinc-500 font-medium border-b border-zinc-700/60">
        {config.label}
      </div>
      <button
        onClick={() => { selectMap(type); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700/60"
      >
        View / Select
      </button>
      <button
        onClick={() => { generateSingleMap(type); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700/60"
      >
        <RefreshCw className="w-3 h-3" />
        {map.generated ? "Regenerate" : "Generate"}
      </button>
      {map.generated && (
        <>
          <button
            onClick={() => { downloadMap(type); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700/60"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
          <div className="border-t border-zinc-700/60 my-1" />
          <button
            onClick={() => { clearSingleMap(type); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-600/10"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </>
      )}
    </div>
  );
}

export default function MapThumbnailStrip() {
  const maps = useAppStore((s) => s.maps);
  const selectedMap = useAppStore((s) => s.selectedMap);
  const selectMap = useAppStore((s) => s.selectMap);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const sourceDataUrl = useAppStore((s) => s.sourceDataUrl);
  const generateSingleMap = useAppStore((s) => s.generateSingleMap);
  const downloadMap = useAppStore((s) => s.downloadMap);
  const clearSingleMap = useAppStore((s) => s.clearSingleMap);
  const downloadAllMaps = useAppStore((s) => s.downloadAllMaps);
  const clearSource = useAppStore((s) => s.clearSource);

  const [contextMenu, setContextMenu] = useState<{ type: MapType; x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, type: MapType) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ type, x: e.clientX, y: e.clientY });
    },
    []
  );

  if (!sourceImageData) return null;

  const generatedCount = MAP_CONFIGS.filter((c) => maps[c.type].generated).length;

  return (
    <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto custom-scrollbar border-t border-zinc-800/60">
      {/* Source image thumbnail */}
      <button
        onClick={() => selectMap(null)}
        className={cn(
          "flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all relative group",
          selectedMap === null
            ? "border-amber-500 ring-2 ring-amber-500/30"
            : "border-zinc-700 hover:border-zinc-500"
        )}
      >
        {sourceDataUrl && (
          <img src={sourceDataUrl} alt="Source" className="w-full h-full object-cover" />
        )}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-200 text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-zinc-700 z-10">
          Source Image
        </div>
      </button>

      <div className="w-px h-10 bg-zinc-700 flex-shrink-0" />

      {/* Map thumbnails */}
      {MAP_CONFIGS.map((config) => {
        const map = maps[config.type];
        const isSelected = selectedMap === config.type;

        return (
          <div
            key={config.type}
            role="button"
            tabIndex={0}
            onClick={() => selectMap(config.type)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectMap(config.type); } }}
            onContextMenu={(e) => handleContextMenu(e, config.type)}
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all relative group cursor-pointer",
              isSelected
                ? "border-amber-500 ring-2 ring-amber-500/30"
                : "border-zinc-700 hover:border-zinc-500",
              !map.enabled && "opacity-35"
            )}
          >
            {map.dataUrl ? (
              <img
                src={map.dataUrl}
                alt={config.label}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: config.color + "10" }}
              >
                {!map.generating && (
                  <span className="text-[8px] text-zinc-600 font-medium text-center leading-tight px-1">
                    {config.label.replace(" Map", "")}
                  </span>
                )}
              </div>
            )}

            {/* Label tooltip on hover */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-200 text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-zinc-700 z-10">
              {config.label}
            </div>

            {/* Generation overlay */}
            {map.generating && (
              <div className="absolute inset-0 bg-zinc-900/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              </div>
            )}

            {/* Generated badge */}
            {map.generated && !map.generating && (
              <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-500/90 flex items-center justify-center">
                <Check className="w-2 h-2 text-white" />
              </div>
            )}

            {/* Hover quick actions */}
            {!map.generating && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-gradient-to-t from-black/80 to-transparent pt-4 pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {map.generated ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadMap(config.type); }}
                      className="p-0.5 rounded bg-zinc-800/80 text-zinc-300 hover:text-amber-400 transition-colors"
                      title="Download"
                    >
                      <Download className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); generateSingleMap(config.type); }}
                      className="p-0.5 rounded bg-zinc-800/80 text-zinc-300 hover:text-amber-400 transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearSingleMap(config.type); }}
                      className="p-0.5 rounded bg-zinc-800/80 text-zinc-300 hover:text-red-400 transition-colors"
                      title="Clear"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); generateSingleMap(config.type); }}
                    className="p-0.5 rounded bg-zinc-800/80 text-zinc-300 hover:text-amber-400 transition-colors"
                    title="Generate"
                  >
                    <Wand2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Quick download all button */}
      {generatedCount > 0 && (
        <>
          <div className="w-px h-10 bg-zinc-700 flex-shrink-0" />
          <button
            onClick={() => downloadAllMaps()}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all text-[10px]"
            title={`Download all ${generatedCount} generated maps`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>{generatedCount}</span>
          </button>
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ThumbnailContextMenu
          type={contextMenu.type}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
