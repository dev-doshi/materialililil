"use client";

import React, { useRef, useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS } from "@/types/maps";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

export default function Viewport2D() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceDataUrl = useAppStore((s) => s.sourceDataUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [pixelInfo, setPixelInfo] = useState<{ x: number; y: number; r: number; g: number; b: number } | null>(null);

  const imageUrl = selectedMap
    ? maps[selectedMap]?.dataUrl
    : sourceDataUrl;

  const mapLabel = selectedMap
    ? MAP_CONFIGS.find((c) => c.type === selectedMap)?.label || ""
    : "Source Image";

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Reset zoom/pan when switching maps
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [selectedMap]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.1, Math.min(20, z * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }

    // Pixel inspector
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      // getBoundingClientRect already reflects the CSS transform (translate + scale)
      const x = Math.floor((e.clientX - rect.left) / (rect.width / canvasRef.current.width));
      const y = Math.floor((e.clientY - rect.top) / (rect.height / canvasRef.current.height));
      const ctx = canvasRef.current.getContext("2d");
      if (ctx && x >= 0 && y >= 0 && x < canvasRef.current.width && y < canvasRef.current.height) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        setPixelInfo({ x, y, r: pixel[0], g: pixel[1], b: pixel[2] });
      } else {
        setPixelInfo(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const fitView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
          <ZoomIn className="w-7 h-7 text-zinc-600" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-400">No Image to Display</p>
          <p className="text-xs text-zinc-600 max-w-[280px]">
            Select a map from the left panel to view it here, or click &quot;Generate All&quot; to create all texture maps from your source image.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 mt-2 text-[10px] text-zinc-600">
          <span>Scroll to zoom in/out</span>
          <span>Shift+drag or right-click to pan</span>
          <span>Hover over pixels to inspect colors</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-zinc-950"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Checkerboard background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
            linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
            linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
          `,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      />

      {/* Canvas */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          className="max-w-none shadow-2xl"
          style={{ imageRendering: zoom > 3 ? "pixelated" : "auto" }}
        />
      </div>

      {/* Map label */}
      <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-zinc-700">
        <span className="text-xs font-medium text-zinc-300">{mapLabel}</span>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-700">
        <button onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))} className="p-2 hover:bg-zinc-700/50 rounded-l-lg">
          <ZoomOut className="w-4 h-4 text-zinc-400" />
        </button>
        <span className="text-xs text-zinc-400 font-mono w-14 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom((z) => Math.min(20, z * 1.2))} className="p-2 hover:bg-zinc-700/50">
          <ZoomIn className="w-4 h-4 text-zinc-400" />
        </button>
        <button onClick={fitView} className="p-2 hover:bg-zinc-700/50 rounded-r-lg">
          <Maximize2 className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Pixel inspector */}
      {pixelInfo && zoom >= 1 && (
        <div className="absolute bottom-3 left-3 bg-zinc-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-zinc-700">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="font-mono">
              {pixelInfo.x}, {pixelInfo.y}
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded border border-zinc-600"
                style={{ backgroundColor: `rgb(${pixelInfo.r},${pixelInfo.g},${pixelInfo.b})` }}
              />
              <span className="font-mono">
                R:{pixelInfo.r} G:{pixelInfo.g} B:{pixelInfo.b}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
