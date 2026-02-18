"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS, MapType } from "@/types/maps";
import { MAP_ICONS } from "@/types/mapIcons";
import { cn } from "@/lib/utils";
import {
  Eye,
  Download,
  RefreshCw,
  Loader2,
  Trash2,
  MoreHorizontal,
  Wand2,
  DownloadCloud,
  Copy,
  RotateCcw,
  ChevronDown,
} from "lucide-react";

// ─── Right-Click / More Context Menu ──────────────────────────────────────────
function MapContextMenu({
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
  const copyParamsToAll = useAppStore((s) => s.copyParamsToAll);

  const map = maps[type];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  type MenuItem =
    | { kind: "separator" }
    | { kind: "action"; label: string; icon: React.FC<{ className?: string }>; onClick: () => void; show: boolean; destructive?: boolean };

  const items: MenuItem[] = [
    {
      kind: "action",
      label: "View / Select",
      icon: Eye,
      onClick: () => { selectMap(type); onClose(); },
      show: true,
    },
    {
      kind: "action",
      label: map.generated ? "Regenerate" : "Generate",
      icon: RefreshCw,
      onClick: () => { generateSingleMap(type); onClose(); },
      show: true,
    },
    { kind: "separator" },
    {
      kind: "action",
      label: "Download",
      icon: Download,
      onClick: () => { downloadMap(type); onClose(); },
      show: !!map.generated,
    },
    {
      kind: "action",
      label: "Copy Params to All Maps",
      icon: Copy,
      onClick: () => { copyParamsToAll(type); onClose(); },
      show: true,
    },
    { kind: "separator" },
    {
      kind: "action",
      label: "Clear This Map",
      icon: Trash2,
      onClick: () => { clearSingleMap(type); onClose(); },
      show: !!map.generated,
      destructive: true,
    },
  ];

  return (
    <div ref={ref} style={{ position: "fixed", left: x, top: y, zIndex: 9999 }} className="min-w-[180px] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1">
      {items.map((item, idx) => {
        if (item.kind === "separator") {
          return <div key={idx} className="border-t border-zinc-700/60 my-1" />;
        }
        if (!item.show) return null;
        const Icon = item.icon;
        return (
          <button
            key={idx}
            onClick={item.onClick}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] transition-colors text-left",
              item.destructive
                ? "text-red-400 hover:bg-red-600/10"
                : "text-zinc-300 hover:bg-zinc-700/60"
            )}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Batch Actions Dropdown ───────────────────────────────────────────────────
function BatchActionsDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const maps = useAppStore((s) => s.maps);
  const generateUngeneratedMaps = useAppStore((s) => s.generateUngeneratedMaps);
  const downloadAllMaps = useAppStore((s) => s.downloadAllMaps);
  const clearAllMaps = useAppStore((s) => s.clearAllMaps);
  const resetAllParams = useAppStore((s) => s.resetAllParams);

  const generatedCount = Object.values(MapType).filter((t) => maps[t].generated).length;
  const ungeneratedCount = Object.values(MapType).length - generatedCount;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  type MenuItem =
    | { kind: "separator" }
    | { kind: "action"; label: string; icon: React.FC<{ className?: string }>; onClick: () => void; show: boolean; destructive?: boolean };

  const items: MenuItem[] = [
    {
      kind: "action",
      label: `Generate Missing (${ungeneratedCount})`,
      icon: Wand2,
      onClick: () => { generateUngeneratedMaps(); onClose(); },
      show: ungeneratedCount > 0,
    },
    {
      kind: "action",
      label: `Download All (${generatedCount})`,
      icon: DownloadCloud,
      onClick: () => { downloadAllMaps(); onClose(); },
      show: generatedCount > 0,
    },
    {
      kind: "action",
      label: "Reset All Params",
      icon: RotateCcw,
      onClick: () => { resetAllParams(); onClose(); },
      show: true,
    },
    { kind: "separator" },
    {
      kind: "action",
      label: "Clear All Maps",
      icon: Trash2,
      onClick: () => { clearAllMaps(); onClose(); },
      show: generatedCount > 0,
      destructive: true,
    },
  ];

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1">
      {items.map((item, idx) => {
        if (item.kind === "separator") {
          return <div key={idx} className="border-t border-zinc-700/60 my-1" />;
        }
        if (!item.show) return null;
        const Icon = item.icon;
        return (
          <button
            key={idx}
            onClick={item.onClick}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] transition-colors text-left",
              item.destructive
                ? "text-red-400 hover:bg-red-600/10"
                : "text-zinc-300 hover:bg-zinc-700/60"
            )}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main MapList Component ───────────────────────────────────────────────────
export default function MapList() {
  const maps = useAppStore((s) => s.maps);
  const selectedMap = useAppStore((s) => s.selectedMap);
  const selectMap = useAppStore((s) => s.selectMap);
  const generateSingleMap = useAppStore((s) => s.generateSingleMap);
  const downloadMap = useAppStore((s) => s.downloadMap);
  const clearSingleMap = useAppStore((s) => s.clearSingleMap);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const toggleMapEnabled = useAppStore((s) => s.toggleMapEnabled);

  const [contextMenu, setContextMenu] = useState<{ type: MapType; x: number; y: number } | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

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
  const totalMaps = MAP_CONFIGS.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats and batch actions */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Texture Maps
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 font-mono">
              {generatedCount}/{totalMaps}
            </span>
            <div className="relative">
              <button
                onClick={() => setBatchOpen(!batchOpen)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Batch actions"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {batchOpen && <BatchActionsDropdown onClose={() => setBatchOpen(false)} />}
            </div>
          </div>
        </div>
        {/* Generation progress bar */}
        {generatedCount > 0 && generatedCount < totalMaps && (
          <div className="mt-1.5 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500/60 rounded-full transition-all"
              style={{ width: `${(generatedCount / totalMaps) * 100}%` }}
            />
          </div>
        )}
        {generatedCount === 0 && (
          <p className="text-[10px] text-zinc-600 mt-1">Click a map or use Generate All to start</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {MAP_CONFIGS.map((config) => {
          const map = maps[config.type];
          const isSelected = selectedMap === config.type;

          return (
            <div
              key={config.type}
              role="button"
              tabIndex={0}
              onClick={() => selectMap(config.type)}
              onContextMenu={(e) => handleContextMenu(e, config.type)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectMap(config.type);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer group relative",
                "hover:bg-zinc-800/50 border-l-2",
                isSelected
                  ? "bg-zinc-800/80 border-amber-500"
                  : "border-transparent",
                !map.enabled && "opacity-45"
              )}
            >
              {/* Enable/Disable toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleMapEnabled(config.type); }}
                className={cn(
                  "w-6 h-3.5 rounded-full flex-shrink-0 transition-colors relative",
                  map.enabled ? "bg-amber-500" : "bg-zinc-700"
                )}
                title={map.enabled ? "Disable this map" : "Enable this map"}
              >
                <div className={cn(
                  "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform",
                  map.enabled ? "translate-x-3" : "translate-x-0.5"
                )} />
              </button>
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded border border-zinc-700 overflow-hidden flex-shrink-0 bg-zinc-900">
                {map.dataUrl ? (
                  <img
                    src={map.dataUrl}
                    alt={config.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: config.color + "15" }}
                  >
                    {(() => { const Icon = MAP_ICONS[config.type]; return <Icon className="w-4 h-4" style={{ color: config.color + "80" }} />; })()}
                  </div>
                )}
              </div>

              {/* Info — takes all remaining space */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {config.label}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {map.generated ? "Generated" : map.generating ? "Generating..." : config.description}
                </p>
              </div>

              {/* Status indicator when not hovered */}
              {map.generating && (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
              )}

              {/* Actions — overlay on hover so they don't steal space from the label */}
              <div className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 rounded-md",
                "opacity-0 group-hover:opacity-100 transition-all",
                "bg-zinc-800/95 backdrop-blur-sm shadow-sm border border-zinc-700/40"
              )}>
                {map.generated ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadMap(config.type); }}
                      className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); generateSingleMap(config.type); }}
                      className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearSingleMap(config.type); }}
                      className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
                      title="Clear this map"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); generateSingleMap(config.type); }}
                    className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-amber-400 transition-colors"
                    title="Generate"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleContextMenu(e, config.type); }}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <MapContextMenu
          type={contextMenu.type}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
