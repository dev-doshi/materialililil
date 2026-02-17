"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS } from "@/types/maps";
import { cn } from "@/lib/utils";
import {
  Undo2,
  Redo2,
  Upload,
  Save,
  FolderOpen,
  Eye,
  Trash2,
  Wand2,
  Image,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Loader2,
  Package,
  Grid2X2,
  Keyboard,
  Download,
  ChevronDown,
  Sparkles,
  ImageOff,
  RotateCcw,
  Box,
} from "lucide-react";
import ExportModal from "./ExportModal";
import KeyboardShortcutsHelp from "./KeyboardShortcuts";

export default function TopBar() {
  const saveProject = useAppStore((s) => s.saveProject);
  const loadProject = useAppStore((s) => s.loadProject);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const generateAllMaps = useAppStore((s) => s.generateAllMaps);
  const clearAllMaps = useAppStore((s) => s.clearAllMaps);
  const toggleFullMaterial = useAppStore((s) => s.toggleFullMaterial);
  const showFullMaterial = useAppStore((s) => s.showFullMaterial);
  const generating = useAppStore((s) => s.generating);
  const progress = useAppStore((s) => s.progress);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const sourceFileName = useAppStore((s) => s.sourceFileName);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const leftPanelOpen = useAppStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const toggleLeftPanel = useAppStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useAppStore((s) => s.toggleRightPanel);
  const setSourceImage = useAppStore((s) => s.setSourceImage);
  const generateUngeneratedMaps = useAppStore((s) => s.generateUngeneratedMaps);
  const downloadAllMaps = useAppStore((s) => s.downloadAllMaps);
  const clearSource = useAppStore((s) => s.clearSource);
  const resetAllParams = useAppStore((s) => s.resetAllParams);
  const maps = useAppStore((s) => s.maps);

  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [clearDropdown, setClearDropdown] = useState(false);
  const clearRef = useRef<HTMLDivElement>(null);

  const generatedCount = MAP_CONFIGS.filter((c) => maps[c.type].generated).length;
  const ungeneratedCount = MAP_CONFIGS.length - generatedCount;

  // Close clear dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clearRef.current && !clearRef.current.contains(e.target as Node)) setClearDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNewImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      if (input.files?.[0]) {
        await setSourceImage(input.files[0]);
      }
    };
    input.click();
  }, [setSourceImage]);

  return (
    <>
      <header className="h-11 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/80 flex items-center justify-between px-3 select-none flex-shrink-0">
        {/* Left section */}
        <div className="flex items-center gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-3">
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 rounded bg-amber-500/20 rotate-6" />
              <div className="absolute inset-0 rounded bg-amber-500/40 rotate-3" />
              <div className="absolute inset-0 rounded bg-amber-500 flex items-center justify-center">
                <span className="text-black font-bold text-[10px] font-mono-brand">m</span>
              </div>
            </div>
            <span className="brand-wordmark text-[13px] font-semibold text-zinc-200 hidden sm:block">
              material<span className="brand-repeat">ililil</span>
            </span>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-zinc-700" />

          {/* File name */}
          {sourceFileName && (
            <span className="text-xs text-zinc-400 max-w-32 truncate hidden md:block">
              {sourceFileName}
            </span>
          )}

          {/* Panel toggles */}
          <button
            onClick={toggleLeftPanel}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            title={leftPanelOpen ? "Hide map list panel" : "Show map list panel"}
          >
            {leftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        {/* Center section */}
        <div className="flex items-center gap-1.5">
          {/* Import */}
          <button
            onClick={handleNewImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Import a new source texture image (replaces current)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center">
            <button
              onClick={undo}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              title="Undo last change (⌘Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              title="Redo last undone change (⌘⇧Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-zinc-700" />

          {/* Generate All */}
          <button
            onClick={generateAllMaps}
            disabled={!sourceImageData || generating}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              "bg-amber-500 text-black hover:bg-amber-400",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            title="Generate all 13 texture maps from your source image (⌘G)"
          >
            {generating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{progress}%</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Generate All</span>
              </>
            )}
          </button>

          {/* Generate Missing */}
          {ungeneratedCount > 0 && ungeneratedCount < MAP_CONFIGS.length && (
            <button
              onClick={generateUngeneratedMaps}
              disabled={!sourceImageData || generating}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors",
                "text-amber-300 hover:bg-amber-600/10 border border-amber-500/30",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
              title={`Generate ${ungeneratedCount} missing maps`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{ungeneratedCount} Missing</span>
            </button>
          )}

          {/* Download All */}
          {generatedCount > 0 && (
            <button
              onClick={downloadAllMaps}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title={`Download all ${generatedCount} generated maps`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{generatedCount}</span>
            </button>
          )}

          {/* Show Full Material */}
          <button
            onClick={toggleFullMaterial}
            disabled={!sourceImageData}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors",
              showFullMaterial
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            title="Preview all maps combined on a 3D model (⌘M)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Full Material</span>
          </button>

          {/* Clear dropdown */}
          <div ref={clearRef} className="relative">
            <button
              onClick={() => setClearDropdown((v) => !v)}
              disabled={!sourceImageData}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <ChevronDown className="w-3 h-3" />
            </button>
            {clearDropdown && (
              <div className="absolute top-full mt-1 right-0 min-w-[180px] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 z-50">
                <button
                  onClick={() => { clearAllMaps(); setClearDropdown(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700/60"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All Maps
                </button>
                <p className="px-3 py-0.5 text-[10px] text-zinc-500">Removes generated maps, keeps source</p>
                <button
                  onClick={() => { resetAllParams(); setClearDropdown(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700/60"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset All Params
                </button>
                <p className="px-3 py-0.5 text-[10px] text-zinc-500">Restore all slider values to defaults</p>
                <div className="border-t border-zinc-700/60 my-1" />
                <button
                  onClick={() => { clearSource(); setClearDropdown(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-600/10"
                >
                  <ImageOff className="w-3 h-3" />
                  Remove Source & All Maps
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-zinc-700" />

          {/* View mode toggle */}
          <div className="flex items-center bg-zinc-800 rounded-md p-0.5">
            <button
              onClick={() => setViewMode("2d")}
              className={cn(
                "px-2.5 py-1 rounded text-xs transition-colors",
                viewMode === "2d"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
              title="View a single texture map in 2D (⌘2)"
            >
              <Image className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={cn(
                "px-2.5 py-1 rounded text-xs transition-colors",
                viewMode === "3d"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
              title="Preview material on a 3D model (⌘3)"
            >
              <Box className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-2.5 py-1 rounded text-xs transition-colors",
                viewMode === "grid"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
              title="View all maps side-by-side in a grid"
            >
              <Grid2X2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1.5">
          {/* Export */}
          <button
            onClick={() => setExportOpen(true)}
            disabled={!sourceImageData}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              "bg-green-600 text-white hover:bg-green-500",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            title="Export generated maps as a ZIP file for use in 3D software"
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Save project */}
          <button
            onClick={saveProject}
            disabled={!sourceImageData}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Save project to browser storage (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
          </button>

          {/* Load project */}
          <button
            onClick={loadProject}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            title="Load saved project from browser storage (Ctrl+O)"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          {/* Keyboard shortcuts */}
          <button
            onClick={() => setShortcutsOpen(true)}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            title="View all keyboard shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Right panel toggle */}
          <button
            onClick={toggleRightPanel}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            title={rightPanelOpen ? "Hide settings & adjustments panel" : "Show settings & adjustments panel"}
          >
            {rightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Progress bar when generating */}
      {generating && (
        <div className="h-0.5 bg-zinc-800 relative flex-shrink-0 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 progress-shimmer" />
        </div>
      )}

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <KeyboardShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}
