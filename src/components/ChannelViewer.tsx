"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS } from "@/types/maps";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewChannel = "rgb" | "r" | "g" | "b" | "a";

export default function ChannelViewer() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [channel, setChannel] = useState<ViewChannel>("rgb");

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;
  const label = selectedMap ? MAP_CONFIGS.find((c) => c.type === selectedMap)?.label || "" : "Source";

  const channelImageData = useMemo(() => {
    if (!imageData || channel === "rgb") return imageData;

    const result = new ImageData(imageData.width, imageData.height);
    const src = imageData.data;
    const dst = result.data;

    for (let i = 0; i < src.length; i += 4) {
      let val: number;
      switch (channel) {
        case "r": val = src[i]; break;
        case "g": val = src[i + 1]; break;
        case "b": val = src[i + 2]; break;
        case "a": val = src[i + 3]; break;
        default: val = 0;
      }
      dst[i] = val;
      dst[i + 1] = val;
      dst[i + 2] = val;
      dst[i + 3] = 255;
    }
    return result;
  }, [imageData, channel]);

  useEffect(() => {
    if (!channelImageData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = channelImageData.width;
    canvas.height = channelImageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(channelImageData, 0, 0);
  }, [channelImageData]);

  if (!imageData) {
    return (
      <div className="p-3 text-xs text-zinc-500 text-center">
        No image data
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Channels</span>
        </div>
        <div className="flex items-center gap-0.5 bg-zinc-800 rounded p-0.5">
          {(["rgb", "r", "g", "b", "a"] as ViewChannel[]).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase transition-colors",
                channel === ch
                  ? ch === "r" ? "bg-red-500/20 text-red-400"
                    : ch === "g" ? "bg-green-500/20 text-green-400"
                    : ch === "b" ? "bg-blue-500/20 text-blue-400"
                    : ch === "a" ? "bg-purple-500/20 text-purple-400"
                    : "bg-zinc-700 text-zinc-300"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {ch === "rgb" ? "RGB" : ch.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ imageRendering: "auto" }}
        />
      </div>
      <p className="text-[10px] text-zinc-600 text-center">
        {label} — {channel === "rgb" ? "All Channels" : `${channel.toUpperCase()} Channel`}
      </p>
    </div>
  );
}
