"use client";

import React, { useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS } from "@/types/maps";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Timer, Zap } from "lucide-react";

export default function GenerationStatus() {
  const maps = useAppStore((s) => s.maps);
  const generatingMap = useAppStore((s) => s.generatingMap);
  const sourceImageData = useAppStore((s) => s.sourceImageData);

  const stats = useMemo(() => {
    const total = MAP_CONFIGS.length;
    const generated = MAP_CONFIGS.filter((c) => maps[c.type]?.generated).length;
    const inProgress = MAP_CONFIGS.filter((c) => maps[c.type]?.generating).length;
    return { total, generated, inProgress, remaining: total - generated - inProgress };
  }, [maps]);

  if (!sourceImageData) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Generation Status</span>
      </div>

      {/* Progress ring */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle
              className="text-zinc-800"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              r="15"
              cx="18"
              cy="18"
            />
            <circle
              className="text-amber-500 transition-all duration-300"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              r="15"
              cx="18"
              cy="18"
              strokeDasharray={`${(stats.generated / stats.total) * 94.2} 94.2`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-zinc-300">{stats.generated}/{stats.total}</span>
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className="text-zinc-400">{stats.generated} generated</span>
          </div>
          {stats.inProgress > 0 && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <Timer className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="text-zinc-400">{stats.inProgress} in progress</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px]">
            <Circle className="w-3 h-3 text-zinc-600" />
            <span className="text-zinc-500">{stats.remaining} remaining</span>
          </div>
        </div>
      </div>

      {/* Currently generating */}
      {generatingMap && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-950/20 border border-amber-700/30 animate-pulse">
          <Timer className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] text-amber-300">
            Generating {MAP_CONFIGS.find((c) => c.type === generatingMap)?.label}...
          </span>
        </div>
      )}

      {/* Compact map status list */}
      <div className="grid grid-cols-4 gap-0.5">
        {MAP_CONFIGS.map((config) => {
          const map = maps[config.type];
          return (
            <div
              key={config.type}
              className={cn(
                "flex items-center justify-center px-1 py-1 rounded text-[8px] font-medium",
                map.generating
                  ? "bg-amber-950/30 text-amber-400"
                  : map.generated
                  ? "bg-green-950/20 text-green-500"
                  : "bg-zinc-900 text-zinc-600"
              )}
              title={`${config.label}: ${map.generating ? "Generating" : map.generated ? "Done" : "Pending"}`}
            >
              {config.label.replace(" Map", "").slice(0, 4)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
