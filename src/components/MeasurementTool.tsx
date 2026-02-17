"use client";

import React, { useState, useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS } from "@/types/maps";
import { cn } from "@/lib/utils";
import { Ruler } from "lucide-react";

type MeasureMode = "off" | "distance" | "area";

export default function MeasurementTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;
  const [mode, setMode] = useState<MeasureMode>("off");
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  const dimensions = useMemo(() => {
    if (!imageData) return null;
    return { width: imageData.width, height: imageData.height };
  }, [imageData]);

  const stats = useMemo(() => {
    if (!imageData || points.length < 2) return null;

    const p1 = points[0];
    const p2 = points[1];

    if (mode === "distance") {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      // Sample pixels along the line
      const samples: number[] = [];
      const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.round(p1.x + dx * t);
        const y = Math.round(p1.y + dy * t);
        if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
          const idx = (y * imageData.width + x) * 4;
          const lum = 0.299 * imageData.data[idx] + 0.587 * imageData.data[idx + 1] + 0.114 * imageData.data[idx + 2];
          samples.push(lum);
        }
      }

      const avgLum = samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
      const minLum = samples.length > 0 ? Math.min(...samples) : 0;
      const maxLum = samples.length > 0 ? Math.max(...samples) : 0;

      return {
        distance: dist.toFixed(1),
        angle: angle.toFixed(1),
        avgLum: avgLum.toFixed(0),
        minLum: minLum.toFixed(0),
        maxLum: maxLum.toFixed(0),
        dx: Math.abs(dx),
        dy: Math.abs(dy),
      };
    }

    if (mode === "area") {
      const x1 = Math.min(p1.x, p2.x);
      const y1 = Math.min(p1.y, p2.y);
      const x2 = Math.max(p1.x, p2.x);
      const y2 = Math.max(p1.y, p2.y);
      const w = x2 - x1;
      const h = y2 - y1;
      const area = w * h;

      // Sample region
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      const step = Math.max(1, Math.floor(Math.sqrt(area) / 100));
      for (let y = y1; y <= y2; y += step) {
        for (let x = x1; x <= x2; x += step) {
          if (x < imageData.width && y < imageData.height) {
            const idx = (y * imageData.width + x) * 4;
            sumR += imageData.data[idx];
            sumG += imageData.data[idx + 1];
            sumB += imageData.data[idx + 2];
            count++;
          }
        }
      }

      return {
        width: w,
        height: h,
        area,
        avgR: Math.round(sumR / count),
        avgG: Math.round(sumG / count),
        avgB: Math.round(sumB / count),
      };
    }

    return null;
  }, [imageData, points, mode]);

  if (!imageData || !dimensions) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Ruler className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Measure</span>
        </div>
        <div className="flex items-center gap-0.5 bg-zinc-800 rounded p-0.5">
          {(["off", "distance", "area"] as MeasureMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setPoints([]); }}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium capitalize transition-colors",
                mode === m ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {m === "off" ? "Off" : m}
            </button>
          ))}
        </div>
      </div>

      {mode !== "off" && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600">Point 1</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={points[0]?.x ?? 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setPoints((p) => [{ x: val, y: p[0]?.y ?? 0 }, ...(p.length > 1 ? [p[1]] : [])]);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono"
                  placeholder="X"
                />
                <input
                  type="number"
                  value={points[0]?.y ?? 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setPoints((p) => [{ x: p[0]?.x ?? 0, y: val }, ...(p.length > 1 ? [p[1]] : [])]);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono"
                  placeholder="Y"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600">Point 2</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={points[1]?.x ?? dimensions.width}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setPoints((p) => [(p[0] ?? { x: 0, y: 0 }), { x: val, y: p[1]?.y ?? dimensions.height }]);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono"
                  placeholder="X"
                />
                <input
                  type="number"
                  value={points[1]?.y ?? dimensions.height}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setPoints((p) => [(p[0] ?? { x: 0, y: 0 }), { x: p[1]?.x ?? dimensions.width, y: val }]);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono"
                  placeholder="Y"
                />
              </div>
            </div>
          </div>

          {stats && mode === "distance" && "distance" in stats && (
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="bg-zinc-900 rounded px-2 py-1 border border-zinc-800">
                <p className="text-zinc-500">Distance</p>
                <p className="text-zinc-300 font-mono">{stats.distance}px</p>
              </div>
              <div className="bg-zinc-900 rounded px-2 py-1 border border-zinc-800">
                <p className="text-zinc-500">Angle</p>
                <p className="text-zinc-300 font-mono">{stats.angle}°</p>
              </div>
              <div className="bg-zinc-900 rounded px-2 py-1 border border-zinc-800">
                <p className="text-zinc-500">Δx / Δy</p>
                <p className="text-zinc-300 font-mono">{stats.dx} / {stats.dy}</p>
              </div>
              <div className="bg-zinc-900 rounded px-2 py-1 border border-zinc-800">
                <p className="text-zinc-500">Avg Lum</p>
                <p className="text-zinc-300 font-mono">{stats.avgLum}</p>
              </div>
            </div>
          )}

          {stats && mode === "area" && "area" in stats && (
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="bg-zinc-900 rounded px-2 py-1 border border-zinc-800">
                <p className="text-zinc-500">Size</p>
                <p className="text-zinc-300 font-mono">{stats.width}×{stats.height}</p>
              </div>
              <div className="bg-zinc-900 rounded px-2 py-1 border border-zinc-800">
                <p className="text-zinc-500">Area</p>
                <p className="text-zinc-300 font-mono">{stats.area?.toLocaleString()}px²</p>
              </div>
              <div className="bg-zinc-900 rounded px-2 py-1 border border-zinc-800 col-span-2">
                <p className="text-zinc-500">Avg Color</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div
                    className="w-4 h-4 rounded border border-zinc-700"
                    style={{ backgroundColor: `rgb(${stats.avgR},${stats.avgG},${stats.avgB})` }}
                  />
                  <p className="text-zinc-300 font-mono">
                    R:{stats.avgR} G:{stats.avgG} B:{stats.avgB}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
