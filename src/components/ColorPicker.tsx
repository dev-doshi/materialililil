"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { Pipette, Copy } from "lucide-react";

export default function ColorPicker() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceDataUrl = useAppStore((s) => s.sourceDataUrl);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pickedColor, setPickedColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  const imageUrl = selectedMap ? maps[selectedMap]?.dataUrl : sourceDataUrl;

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

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      const ctx = canvas.getContext("2d")!;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const color = { r: pixel[0], g: pixel[1], b: pixel[2] };
      setPickedColor(color);

      const hex = rgbToHex(color.r, color.g, color.b);
      setRecentColors((prev) => {
        const newArr = [hex, ...prev.filter((c) => c !== hex)].slice(0, 12);
        return newArr;
      });
    },
    []
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!imageUrl) {
    return (
      <div className="p-3 text-xs text-zinc-500 text-center">
        No image loaded
      </div>
    );
  }

  const hex = pickedColor ? rgbToHex(pickedColor.r, pickedColor.g, pickedColor.b) : null;
  const hsl = pickedColor ? rgbToHsl(pickedColor.r, pickedColor.g, pickedColor.b) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Pipette className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Color Picker</span>
      </div>

      {/* Mini image to click on */}
      <div className="relative rounded-lg border border-zinc-800 overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          onClick={handleCanvasClick}
          style={{ imageRendering: "auto" }}
        />
      </div>

      {/* Picked color */}
      {pickedColor && hex && hsl && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg border border-zinc-700 shadow-inner"
              style={{ backgroundColor: hex }}
            />
            <div className="flex-1 space-y-0.5">
              <button
                onClick={() => copyToClipboard(hex)}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-300 hover:text-amber-400 transition-colors"
              >
                {hex} <Copy className="w-2.5 h-2.5" />
              </button>
              <p className="text-[10px] text-zinc-500 font-mono">
                rgb({pickedColor.r}, {pickedColor.g}, {pickedColor.b})
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">
                hsl({hsl.h}°, {hsl.s}%, {hsl.l}%)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-zinc-600">Recent</p>
          <div className="flex flex-wrap gap-1">
            {recentColors.map((c, i) => (
              <button
                key={`${c}-${i}`}
                onClick={() => copyToClipboard(c)}
                className="w-5 h-5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
