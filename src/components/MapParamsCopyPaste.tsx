"use client";

import React, { useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { MapType, MAP_CONFIGS } from "@/types/maps";
import { MAP_ICONS } from "@/types/mapIcons";
import { cn } from "@/lib/utils";
import { Copy, ClipboardPaste, RotateCcw, ArrowRight } from "lucide-react";

/** Copy parameters from one map to another */
export default function MapParamsCopyPaste() {
  const maps = useAppStore((s) => s.maps);
  const selectedMap = useAppStore((s) => s.selectedMap);
  const updateMapParams = useAppStore((s) => s.updateMapParams);

  const [copiedFrom, setCopiedFrom] = useState<MapType | null>(null);
  const [copiedParams, setCopiedParams] = useState<Record<string, unknown> | null>(null);

  const handleCopy = useCallback(() => {
    if (!selectedMap) return;
    const params = { ...maps[selectedMap].params };
    setCopiedParams(params as Record<string, unknown>);
    setCopiedFrom(selectedMap);
  }, [selectedMap, maps]);

  const handlePaste = useCallback(
    (target: MapType) => {
      if (!copiedParams) return;
      // Remove map-specific keys that don't apply to other maps
      const mapSpecificKeys = ['normalStrength', 'deLightStrength', 'metallicThreshold', 'aoRadius', 'aoIntensity', 'edgeLowThreshold', 'edgeHighThreshold', 'emissiveThreshold'];
      const commonParams: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(copiedParams)) {
        if (!mapSpecificKeys.includes(key)) {
          commonParams[key] = value;
        }
      }
      updateMapParams(target, commonParams as Record<string, number | boolean | string>);
    },
    [copiedParams, updateMapParams]
  );

  if (!selectedMap) return null;

  const generatedMaps = MAP_CONFIGS.filter((c) => c.type !== selectedMap);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Copy / Paste Params</p>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
        {copiedParams && (
          <span className="text-[10px] text-zinc-600 truncate">
            from {MAP_CONFIGS.find((c) => c.type === copiedFrom)?.label.replace(" Map", "")}
          </span>
        )}
      </div>

      {copiedParams && (
        <div className="space-y-1">
          <p className="text-[10px] text-zinc-600">Paste common params to:</p>
          <div className="grid grid-cols-2 gap-1">
            {generatedMaps.map((config) => (
              <button
                key={config.type}
                onClick={() => handlePaste(config.type)}
                className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 text-[10px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors text-left"
              >
                {(() => { const Icon = MAP_ICONS[config.type]; return <Icon className="w-3 h-3 flex-shrink-0" style={{ color: config.color }} />; })()}
                <span className="truncate">{config.label.replace(" Map", "")}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
