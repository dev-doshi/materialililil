"use client";

import React, { useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS, MapType } from "@/types/maps";
import { cn } from "@/lib/utils";
import { Palette } from "lucide-react";

/** A compact multi-map side-by-side comparison with a user-selectable set */
export default function MapMiniGrid() {
  const maps = useAppStore((s) => s.maps);
  const selectMap = useAppStore((s) => s.selectMap);
  const selectedMap = useAppStore((s) => s.selectedMap);
  const sourceDataUrl = useAppStore((s) => s.sourceDataUrl);
  const [visible, setVisible] = React.useState<Set<MapType>>(
    new Set([MapType.Height, MapType.Normal, MapType.Diffuse, MapType.Roughness])
  );

  const toggleMap = (type: MapType) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const items = useMemo(() => {
    return Array.from(visible)
      .map((type) => {
        const config = MAP_CONFIGS.find((c) => c.type === type)!;
        const map = maps[type];
        return { type, config, map };
      })
      .filter(Boolean);
  }, [visible, maps]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Mini Grid</span>
        </div>
      </div>

      {/* Toggle which maps to show */}
      <div className="flex flex-wrap gap-1">
        {MAP_CONFIGS.map((config) => (
          <button
            key={config.type}
            onClick={() => toggleMap(config.type)}
            className={cn(
              "text-[8px] px-1 py-0.5 rounded transition-colors",
              visible.has(config.type)
                ? "bg-zinc-700 text-zinc-200"
                : "bg-zinc-900 text-zinc-600 hover:text-zinc-400"
            )}
          >
            {config.label.replace(" Map", "")}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden border border-zinc-800">
        {/* Source */}
        <button
          onClick={() => selectMap(null)}
          className={cn(
            "relative aspect-square overflow-hidden group",
            selectedMap === null && "ring-2 ring-amber-500 ring-inset"
          )}
        >
          {sourceDataUrl ? (
            <img src={sourceDataUrl} alt="Source" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <span className="text-[8px] text-zinc-600">Source</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 text-[7px] text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
            Source
          </div>
        </button>

        {/* Selected maps */}
        {items.map(({ type, config, map }) => (
          <button
            key={type}
            onClick={() => selectMap(type)}
            className={cn(
              "relative aspect-square overflow-hidden group",
              selectedMap === type && "ring-2 ring-amber-500 ring-inset"
            )}
          >
            {map.dataUrl ? (
              <img src={map.dataUrl} alt={config.label} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center" style={{ backgroundColor: config.color + "08" }}>
                <span className="text-[8px] text-zinc-600">{config.label.replace(" Map", "")}</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 text-[7px] text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
              {config.label.replace(" Map", "")}
            </div>
            <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
          </button>
        ))}
      </div>
    </div>
  );
}
