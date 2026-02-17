"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS } from "@/types/maps";
import { SplitSquareHorizontal } from "lucide-react";

export default function BeforeAfterSlider() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceDataUrl = useAppStore((s) => s.sourceDataUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const afterUrl = selectedMap ? maps[selectedMap]?.dataUrl : null;
  const beforeUrl = sourceDataUrl;
  const label = selectedMap ? MAP_CONFIGS.find((c) => c.type === selectedMap)?.label || "" : "";

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setPosition(x * 100);
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      handleMove(e.clientX);
    },
    [handleMove]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onUp = () => setIsDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, handleMove]);

  if (!beforeUrl || !afterUrl) {
    return (
      <div className="p-3 text-xs text-zinc-500 text-center">
        Select a generated map to compare with source
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <SplitSquareHorizontal className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Compare</span>
        <span className="text-[10px] text-zinc-600 ml-auto">Source vs {label}</span>
      </div>

      <div
        ref={containerRef}
        className="relative rounded-lg border border-zinc-800 overflow-hidden cursor-col-resize select-none"
        style={{ aspectRatio: "1 / 1" }}
        onMouseDown={handleMouseDown}
      >
        {/* Before (Source) */}
        <img
          src={beforeUrl}
          alt="Source"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* After (Map) with clip */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={afterUrl}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg"
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
            <SplitSquareHorizontal className="w-4 h-4 text-zinc-800" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-2 left-2 bg-black/60 text-[10px] text-zinc-300 px-1.5 py-0.5 rounded">
          Source
        </div>
        <div className="absolute top-2 right-2 bg-black/60 text-[10px] text-zinc-300 px-1.5 py-0.5 rounded">
          {label}
        </div>
      </div>
    </div>
  );
}
