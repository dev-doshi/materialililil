"use client";

import React, { useEffect, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS } from "@/types/maps";
import { Keyboard } from "lucide-react";

export function useKeyboardShortcuts() {
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const generateAllMaps = useAppStore((s) => s.generateAllMaps);
  const generateUngeneratedMaps = useAppStore((s) => s.generateUngeneratedMaps);
  const generateSingleMap = useAppStore((s) => s.generateSingleMap);
  const downloadAllMaps = useAppStore((s) => s.downloadAllMaps);
  const downloadMap = useAppStore((s) => s.downloadMap);
  const clearSingleMap = useAppStore((s) => s.clearSingleMap);
  const toggleLeftPanel = useAppStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useAppStore((s) => s.toggleRightPanel);
  const selectMap = useAppStore((s) => s.selectMap);
  const toggleFullMaterial = useAppStore((s) => s.toggleFullMaterial);
  const saveProject = useAppStore((s) => s.saveProject);
  const loadProject = useAppStore((s) => s.loadProject);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const ctrl = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Ctrl+Z — Undo
      if (ctrl && !shift && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z — Redo
      if (ctrl && shift && e.key === "z") {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+G — Generate All
      if (ctrl && !shift && e.key === "g") {
        e.preventDefault();
        generateAllMaps();
        return;
      }

      // Ctrl+Shift+G — Generate Missing Only
      if (ctrl && shift && e.key === "G") {
        e.preventDefault();
        generateUngeneratedMaps();
        return;
      }

      // Ctrl+[ — Toggle Left Panel
      if (ctrl && e.key === "[") {
        e.preventDefault();
        toggleLeftPanel();
        return;
      }

      // Ctrl+] — Toggle Right Panel
      if (ctrl && e.key === "]") {
        e.preventDefault();
        toggleRightPanel();
        return;
      }

      // Ctrl+D — Download all generated
      if (ctrl && e.key === "d") {
        e.preventDefault();
        downloadAllMaps();
        return;
      }

      // Ctrl+Shift+D — Download current map
      if (ctrl && shift && e.key === "D") {
        e.preventDefault();
        const selected = useAppStore.getState().selectedMap;
        if (selected) downloadMap(selected);
        return;
      }

      // Ctrl+M — Toggle Full Material
      if (ctrl && e.key === "m") {
        e.preventDefault();
        toggleFullMaterial();
        return;
      }

      // Ctrl+S — Save Project
      if (ctrl && !shift && e.key === "s") {
        e.preventDefault();
        saveProject();
        return;
      }

      // Ctrl+O — Load Project
      if (ctrl && !shift && e.key === "o") {
        e.preventDefault();
        loadProject();
        return;
      }

      // Enter — Generate/Regenerate current selected map
      if (!ctrl && !shift && e.key === "Enter" && !isInput) {
        const selected = useAppStore.getState().selectedMap;
        if (selected) {
          e.preventDefault();
          generateSingleMap(selected);
        }
        return;
      }

      // Delete/Backspace — Clear current selected map
      if (!ctrl && (e.key === "Delete" || e.key === "Backspace") && !isInput) {
        const selected = useAppStore.getState().selectedMap;
        if (selected && useAppStore.getState().maps[selected].generated) {
          e.preventDefault();
          clearSingleMap(selected);
        }
        return;
      }

      // ← → — Navigate between maps
      if (!ctrl && !isInput && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const currentMap = useAppStore.getState().selectedMap;
        const currentIndex = currentMap ? MAP_CONFIGS.findIndex((c) => c.type === currentMap) : -1;
        let nextIndex: number;
        if (e.key === "ArrowRight") {
          nextIndex = currentIndex < MAP_CONFIGS.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : MAP_CONFIGS.length - 1;
        }
        selectMap(MAP_CONFIGS[nextIndex].type);
        return;
      }

      // 1-9 — Select maps, 0 — Source
      if (!ctrl && !shift && !e.altKey && e.key >= "0" && e.key <= "9") {
        if (isInput) return;

        const mapIndex = parseInt(e.key);
        if (mapIndex === 0) {
          selectMap(null);
        } else {
          const cfg = MAP_CONFIGS[mapIndex - 1];
          if (cfg) selectMap(cfg.type);
        }
        return;
      }

      // Ctrl+2/3/4 — View mode switching
      if (ctrl && e.key === "2") {
        e.preventDefault();
        useAppStore.getState().setViewMode("2d");
        return;
      }
      if (ctrl && e.key === "3") {
        e.preventDefault();
        useAppStore.getState().setViewMode("3d");
        return;
      }
      if (ctrl && e.key === "4") {
        e.preventDefault();
        useAppStore.getState().setViewMode("grid");
        return;
      }

      // Escape — Deselect map
      if (e.key === "Escape") {
        selectMap(null);
        return;
      }
    },
    [undo, redo, generateAllMaps, generateUngeneratedMaps, generateSingleMap, downloadAllMaps, downloadMap, clearSingleMap, toggleLeftPanel, toggleRightPanel, selectMap, toggleFullMaterial, saveProject, loadProject]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export default function KeyboardShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, onClose]);

  if (!open) return null;

  const shortcuts = [
    { category: "General", items: [
      { keys: "⌘Z", label: "Undo" },
      { keys: "⌘⇧Z", label: "Redo" },
      { keys: "⌘G", label: "Generate All Maps" },
      { keys: "⌘⇧G", label: "Generate Missing Maps" },
      { keys: "Enter", label: "Generate Selected Map" },
      { keys: "⌘M", label: "Toggle Full Material" },
      { keys: "Esc", label: "Deselect Map" },
    ]},
    { category: "Project", items: [
      { keys: "⌘S", label: "Save Project" },
      { keys: "⌘O", label: "Load Project" },
    ]},
    { category: "Downloads", items: [
      { keys: "⌘D", label: "Download All Generated" },
      { keys: "⌘⇧D", label: "Download Current Map" },
    ]},
    { category: "Editing", items: [
      { keys: "Delete", label: "Clear Selected Map" },
      { keys: "←  →", label: "Navigate Maps" },
    ]},
    { category: "Navigation", items: [
      { keys: "0", label: "View Source Image" },
      { keys: "1-9", label: "Select Map 1-9" },
      { keys: "⌘2", label: "Switch to 2D View" },
      { keys: "⌘3", label: "Switch to 3D View" },
      { keys: "⌘4", label: "Switch to Grid View" },
    ]},
    { category: "Panels", items: [
      { keys: "⌘[", label: "Toggle Left Panel" },
      { keys: "⌘]", label: "Toggle Right Panel" },
    ]},
    { category: "Viewport", items: [
      { keys: "Scroll", label: "Zoom In/Out" },
      { keys: "Shift+Drag", label: "Pan View" },
      { keys: "Middle Click", label: "Pan View" },
    ]},
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-[90vw] max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {shortcuts.map((group) => (
            <div key={group.category} className="space-y-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{group.category}</p>
              <div className="space-y-1">
                {group.items.map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-zinc-300">{s.label}</span>
                    <kbd className="bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-400 font-mono">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
