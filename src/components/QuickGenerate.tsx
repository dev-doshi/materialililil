"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS, MapType } from "@/types/maps";
import { MAP_ICONS } from "@/types/mapIcons";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles, Wand2, Zap, Building, CheckSquare, Square, Download } from "lucide-react";

export default function QuickGenerate() {
  const maps = useAppStore((s) => s.maps);
  const generateSingleMap = useAppStore((s) => s.generateSingleMap);
  const generateSelectedMaps = useAppStore((s) => s.generateSelectedMaps);
  const generateUngeneratedMaps = useAppStore((s) => s.generateUngeneratedMaps);
  const downloadAllMaps = useAppStore((s) => s.downloadAllMaps);
  const generating = useAppStore((s) => s.generating);
  const sourceImageData = useAppStore((s) => s.sourceImageData);

  const [selectedForBatch, setSelectedForBatch] = useState<Set<MapType>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  if (!sourceImageData) return null;

  const generatedCount = MAP_CONFIGS.filter((c) => maps[c.type].generated).length;
  const ungeneratedCount = MAP_CONFIGS.length - generatedCount;

  const toggleBatchItem = (type: MapType) => {
    setSelectedForBatch((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const quickSets = [
    {
      name: "Essential PBR",
      desc: "Best starting point — covers most use cases",
      icon: Sparkles,
      maps: [MapType.Height, MapType.Normal, MapType.Diffuse, MapType.Roughness, MapType.Metallic, MapType.AO],
      color: "blue",
    },
    {
      name: "Game Ready",
      desc: "Optimized for game engines like Unity & Unreal",
      icon: Wand2,
      maps: [MapType.Diffuse, MapType.Normal, MapType.Roughness, MapType.Metallic, MapType.AO, MapType.Emissive, MapType.Opacity],
      color: "purple",
    },
    {
      name: "Architectural",
      desc: "For architecture visualization & CAD renders",
      icon: Building,
      maps: [MapType.Height, MapType.Normal, MapType.Diffuse, MapType.Roughness, MapType.AO, MapType.Displacement, MapType.Specular],
      color: "amber",
    },
    {
      name: "Lighting & Detail",
      desc: "Extra maps for advanced lighting effects",
      icon: Zap,
      maps: [MapType.Normal, MapType.AO, MapType.Curvature, MapType.Edge, MapType.Displacement, MapType.Smoothness],
      color: "green",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Quick Generate</p>
        <div className="flex items-center gap-1">
          {ungeneratedCount > 0 && (
            <button
              onClick={generateUngeneratedMaps}
              disabled={generating}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-amber-400 hover:bg-amber-600/10 transition-colors disabled:opacity-40"
              title={`Generate ${ungeneratedCount} missing maps`}
            >
              <Zap className="w-3 h-3" />
              {ungeneratedCount} missing
            </button>
          )}
          {generatedCount > 0 && (
            <button
              onClick={downloadAllMaps}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title={`Download ${generatedCount} maps`}
            >
              <Download className="w-3 h-3" />
              {generatedCount}
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-zinc-500 -mt-1">Pick a preset or generate maps individually below</p>

      {/* Preset quick sets */}
      {quickSets.map((qs) => {
        const generated = qs.maps.filter((m) => maps[m].generated).length;
        const total = qs.maps.length;
        const allDone = generated === total;

        return (
          <button
            key={qs.name}
            onClick={async () => {
              for (const m of qs.maps) {
                if (!maps[m].generated && !maps[m].generating) {
                  generateSingleMap(m);
                  await new Promise((res) => setTimeout(res, 100));
                }
              }
            }}
            disabled={generating || allDone}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all",
              allDone
                ? "border-green-800/50 bg-green-950/20"
                : qs.color === "blue"
                ? "border-amber-700/30 bg-amber-950/10 hover:border-amber-600/50 hover:bg-amber-950/20"
                : qs.color === "purple"
                ? "border-purple-800/30 bg-purple-950/10 hover:border-purple-700/50 hover:bg-purple-950/20"
                : qs.color === "green"
                ? "border-emerald-800/30 bg-emerald-950/10 hover:border-emerald-700/50 hover:bg-emerald-950/20"
                : "border-amber-800/30 bg-amber-950/10 hover:border-amber-700/50 hover:bg-amber-950/20",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <qs.icon className={cn("w-4 h-4", allDone ? "text-green-400" : qs.color === "blue" ? "text-amber-400" : qs.color === "purple" ? "text-purple-400" : qs.color === "green" ? "text-emerald-400" : "text-amber-400")} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-medium", allDone ? "text-green-300" : "text-zinc-200")}>
                {qs.name}
              </p>
              <p className="text-[10px] text-zinc-500">
                {allDone ? `${generated}/${total} maps ✓` : qs.desc}
              </p>
            </div>
            {!allDone && (
              <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", qs.color === "blue" ? "bg-amber-500" : qs.color === "purple" ? "bg-purple-500" : qs.color === "green" ? "bg-emerald-500" : "bg-amber-500")}
                  style={{ width: `${(generated / total) * 100}%` }}
                />
              </div>
            )}
          </button>
        );
      })}

      {/* Batch select mode toggle */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => { setBatchMode((v) => !v); setSelectedForBatch(new Set()); }}
          className={cn(
            "text-[10px] px-2 py-0.5 rounded transition-colors",
            batchMode ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {batchMode ? "Exit Batch Select" : "Batch Select"}
        </button>
        {batchMode && selectedForBatch.size > 0 && (
          <button
            onClick={() => { generateSelectedMaps(Array.from(selectedForBatch)); setBatchMode(false); setSelectedForBatch(new Set()); }}
            disabled={generating}
            className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-black hover:bg-amber-400 transition-colors disabled:opacity-40"
          >
            Generate {selectedForBatch.size} Selected
          </button>
        )}
      </div>

      {/* Individual map buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        {MAP_CONFIGS.map((config) => {
          const map = maps[config.type];
          const isInBatch = selectedForBatch.has(config.type);
          return (
            <button
              key={config.type}
              onClick={() => {
                if (batchMode) {
                  toggleBatchItem(config.type);
                } else {
                  generateSingleMap(config.type);
                }
              }}
              disabled={!batchMode && (map.generating || generating)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-[10px] transition-all relative",
                batchMode && isInBatch
                  ? "border-amber-500/50 bg-amber-950/20 text-amber-300"
                  : map.generated
                  ? "border-green-800/30 bg-green-950/10 text-green-400"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {batchMode && (
                <div className="absolute top-0.5 right-0.5">
                  {isInBatch ? (
                    <CheckSquare className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Square className="w-3 h-3 text-zinc-600" />
                  )}
                </div>
              )}
              {map.generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                (() => { const Icon = MAP_ICONS[config.type]; return <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />; })()
              )}
              <span className="truncate w-full text-center">{config.label.replace(" Map", "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
