"use client";

import React, { useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS } from "@/types/maps";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

function computeHistogram(imageData: ImageData) {
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const lum = new Uint32Array(256);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++;
    g[data[i + 1]]++;
    b[data[i + 2]]++;
    const l = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    lum[l]++;
  }

  return { r, g, b, lum };
}

function computeStats(imageData: ImageData) {
  const data = imageData.data;
  let minR = 255, maxR = 0, sumR = 0;
  let minG = 255, maxG = 0, sumG = 0;
  let minB = 255, maxB = 0, sumB = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const rv = data[i], gv = data[i + 1], bv = data[i + 2];
    if (rv < minR) minR = rv; if (rv > maxR) maxR = rv; sumR += rv;
    if (gv < minG) minG = gv; if (gv > maxG) maxG = gv; sumG += gv;
    if (bv < minB) minB = bv; if (bv > maxB) maxB = bv; sumB += bv;
  }

  const avgLum = Math.round((sumR / pixelCount * 0.299 + sumG / pixelCount * 0.587 + sumB / pixelCount * 0.114));

  // Estimate unique colors (sampling for performance)
  const colorSet = new Set<number>();
  const step = Math.max(1, Math.floor(pixelCount / 50000));
  for (let i = 0; i < data.length; i += 4 * step) {
    colorSet.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
  }

  return {
    min: { r: minR, g: minG, b: minB },
    max: { r: maxR, g: maxG, b: maxB },
    avg: { r: Math.round(sumR / pixelCount), g: Math.round(sumG / pixelCount), b: Math.round(sumB / pixelCount) },
    avgLum,
    estimatedColors: colorSet.size * step,
    pixelCount,
  };
}

type Channel = "lum" | "r" | "g" | "b";

function HistogramBars({ data, channel, maxVal }: { data: Uint32Array; channel: Channel; maxVal: number }) {
  const color = channel === "r" ? "#ef4444" : channel === "g" ? "#22c55e" : channel === "b" ? "#3b82f6" : "#a1a1aa";
  const fillColor = channel === "r" ? "rgba(239,68,68,0.3)" : channel === "g" ? "rgba(34,197,94,0.3)" : channel === "b" ? "rgba(59,130,246,0.3)" : "rgba(161,161,170,0.25)";

  return (
    <svg viewBox="0 0 256 80" className="w-full h-16" preserveAspectRatio="none">
      {Array.from(data).map((val, i) => {
        const h = maxVal > 0 ? (val / maxVal) * 80 : 0;
        return (
          <rect
            key={i}
            x={i}
            y={80 - h}
            width={1}
            height={h}
            fill={fillColor}
            stroke={color}
            strokeWidth={0.3}
          />
        );
      })}
    </svg>
  );
}

export default function Histogram() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;
  const label = selectedMap ? MAP_CONFIGS.find((c) => c.type === selectedMap)?.label || "" : "Source Image";

  const [activeChannel, setActiveChannel] = React.useState<Channel>("lum");

  const histogram = useMemo(() => {
    if (!imageData) return null;
    return computeHistogram(imageData);
  }, [imageData]);

  const stats = useMemo(() => {
    if (!imageData) return null;
    return computeStats(imageData);
  }, [imageData]);

  if (!imageData || !histogram || !stats) {
    return (
      <div className="p-3 text-xs text-zinc-500 text-center">
        No image data available
      </div>
    );
  }

  const maxVal = Math.max(...histogram[activeChannel]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Histogram</span>
        </div>
        <div className="flex items-center gap-0.5 bg-zinc-800 rounded p-0.5">
          {(["lum", "r", "g", "b"] as Channel[]).map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase transition-colors",
                activeChannel === ch
                  ? ch === "r" ? "bg-red-500/20 text-red-400"
                    : ch === "g" ? "bg-green-500/20 text-green-400"
                    : ch === "b" ? "bg-blue-500/20 text-blue-400"
                    : "bg-zinc-700 text-zinc-300"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {ch === "lum" ? "L" : ch.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-1.5 overflow-hidden">
        <HistogramBars data={histogram[activeChannel]} channel={activeChannel} maxVal={maxVal} />
        <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5 px-0.5">
          <span>0</span>
          <span>128</span>
          <span>255</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="bg-zinc-900 rounded px-2 py-1.5 border border-zinc-800">
          <p className="text-zinc-500">Avg Lum</p>
          <p className="text-zinc-300 font-mono font-medium">{stats.avgLum}</p>
        </div>
        <div className="bg-zinc-900 rounded px-2 py-1.5 border border-zinc-800">
          <p className="text-zinc-500">Min/Max</p>
          <p className="text-zinc-300 font-mono font-medium">{stats.min.r}/{stats.max.r}</p>
        </div>
        <div className="bg-zinc-900 rounded px-2 py-1.5 border border-zinc-800">
          <p className="text-zinc-500">Colors</p>
          <p className="text-zinc-300 font-mono font-medium">~{(stats.estimatedColors / 1000).toFixed(0)}K</p>
        </div>
      </div>
    </div>
  );
}
