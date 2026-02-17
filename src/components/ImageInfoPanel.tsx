"use client";

import React, { useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS } from "@/types/maps";
import { Info } from "lucide-react";
import { formatBytes } from "@/lib/utils";

export default function ImageInfoPanel() {
  const sourceWidth = useAppStore((s) => s.sourceWidth);
  const sourceHeight = useAppStore((s) => s.sourceHeight);
  const sourceFileName = useAppStore((s) => s.sourceFileName);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;
  const label = selectedMap ? MAP_CONFIGS.find((c) => c.type === selectedMap)?.label || "" : "Source Image";

  const info = useMemo(() => {
    if (!imageData) return null;

    const w = imageData.width;
    const h = imageData.height;
    const megapixels = ((w * h) / 1_000_000).toFixed(2);
    const rawSize = w * h * 4; // RGBA
    const aspectRatio = gcd(w, h);

    return {
      width: w,
      height: h,
      megapixels,
      rawSize,
      aspectRatio: `${w / aspectRatio}:${h / aspectRatio}`,
      bitDepth: 8,
      channels: 4,
      colorSpace: "sRGB",
    };
  }, [imageData]);

  if (!info) {
    return (
      <div className="p-3 text-xs text-zinc-500 text-center">
        No image loaded
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Image Info</span>
      </div>

      <div className="space-y-1">
        <InfoRow label="Name" value={sourceFileName || "—"} />
        <InfoRow label="Current" value={label} />
        <InfoRow label="Dimensions" value={`${info.width} × ${info.height}`} />
        <InfoRow label="Source Size" value={`${sourceWidth} × ${sourceHeight}`} />
        <InfoRow label="Megapixels" value={`${info.megapixels} MP`} />
        <InfoRow label="Aspect Ratio" value={info.aspectRatio} />
        <InfoRow label="Bit Depth" value={`${info.bitDepth}-bit`} />
        <InfoRow label="Channels" value={`${info.channels} (RGBA)`} />
        <InfoRow label="Color Space" value={info.colorSpace} />
        <InfoRow label="Raw Size" value={formatBytes(info.rawSize)} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <span className="text-[10px] text-zinc-300 font-mono truncate max-w-[120px]">{value}</span>
    </div>
  );
}

function gcd(a: number, b: number): number {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
