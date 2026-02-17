"use client";

import React, { useRef, useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS } from "@/types/maps";
import { cn } from "@/lib/utils";
import { Grid3X3 } from "lucide-react";

/** Maximum canvas dimension to prevent browser canvas size limits */
const MAX_CANVAS_DIM = 4096;

export default function TilingPreview() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceDataUrl = useAppStore((s) => s.sourceDataUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tiles, setTiles] = useState(2);
  const [seamHighlight, setSeamHighlight] = useState(false);

  const imageUrl = selectedMap ? maps[selectedMap]?.dataUrl : sourceDataUrl;
  const label = selectedMap
    ? MAP_CONFIGS.find((c) => c.type === selectedMap)?.label || ""
    : "Source Image";

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    let cancelled = false;

    img.onload = () => {
      if (cancelled) return;

      // Compute tile size, scaling down if the total canvas would exceed limits
      let tileW = img.width;
      let tileH = img.height;
      const totalW = tileW * tiles;
      const totalH = tileH * tiles;

      if (totalW > MAX_CANVAS_DIM || totalH > MAX_CANVAS_DIM) {
        const scale = Math.min(MAX_CANVAS_DIM / totalW, MAX_CANVAS_DIM / totalH);
        tileW = Math.floor(tileW * scale);
        tileH = Math.floor(tileH * scale);
      }

      canvas.width = tileW * tiles;
      canvas.height = tileH * tiles;

      for (let row = 0; row < tiles; row++) {
        for (let col = 0; col < tiles; col++) {
          ctx.drawImage(img, col * tileW, row * tileH, tileW, tileH);
        }
      }

      if (seamHighlight) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        for (let i = 1; i < tiles; i++) {
          ctx.beginPath();
          ctx.moveTo(i * tileW, 0);
          ctx.lineTo(i * tileW, canvas.height);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i * tileH);
          ctx.lineTo(canvas.width, i * tileH);
          ctx.stroke();
        }
      }
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [imageUrl, tiles, seamHighlight]);

  if (!imageUrl) {
    return (
      <div className="p-3 text-xs text-zinc-500 text-center">
        No image to preview tiling
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Grid3X3 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tiling Preview</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSeamHighlight(!seamHighlight)}
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded transition-colors",
              seamHighlight ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            )}
          >
            Seams
          </button>
          <select
            value={tiles}
            onChange={(e) => setTiles(parseInt(e.target.value))}
            className="text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300"
          >
            <option value={2}>2×2</option>
            <option value={3}>3×3</option>
            <option value={4}>4×4</option>
            <option value={5}>5×5</option>
          </select>
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
        {label} — {tiles}×{tiles} tile preview
      </p>
    </div>
  );
}
