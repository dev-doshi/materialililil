"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileImage, Layers, Zap, Lock } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/bmp": [".bmp"],
  "image/tiff": [".tiff", ".tif"],
  "image/svg+xml": [".svg"],
};

export default function UploadZone() {
  const setSourceImage = useAppStore((s) => s.setSourceImage);
  const sourceDataUrl = useAppStore((s) => s.sourceDataUrl);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        await setSourceImage(acceptedFiles[0]);
      }
    },
    [setSourceImage]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: false,
    maxSize: 100 * 1024 * 1024,
  });

  if (sourceDataUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0c]">
      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px" }} />

      <div className="relative z-10 flex flex-col items-center gap-10 max-w-xl w-full px-6">
        {/* Wordmark */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Custom logo mark — stacked layers */}
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-md bg-amber-500/20 rotate-6" />
              <div className="absolute inset-0 rounded-md bg-amber-500/40 rotate-3" />
              <div className="absolute inset-0 rounded-md bg-amber-500 flex items-center justify-center">
                <span className="text-black font-bold text-sm font-mono-brand">m</span>
              </div>
            </div>
            <h1 className="brand-wordmark text-2xl font-semibold text-zinc-100">
              material<span className="brand-repeat">ililil</span>
            </h1>
          </div>
          <p className="text-xs text-zinc-500 tracking-wide">
            texture maps from a single image
          </p>
        </div>

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center w-full py-20",
            "border rounded-xl cursor-pointer group",
            isDragActive
              ? "border-amber-500/60 bg-amber-500/[0.04]"
              : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/20 hover:bg-zinc-900/40"
          )}
          style={{ transition: "all 0.15s ease" }}
        >
          <input {...getInputProps()} />

          <div className={cn(
            "flex flex-col items-center gap-4",
            isDragActive && "scale-[1.02]"
          )}
            style={{ transition: "transform 0.15s ease" }}
          >
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              isDragActive
                ? "bg-amber-500/10 text-amber-400"
                : "bg-zinc-800/60 text-zinc-500 group-hover:text-zinc-400"
            )}>
              {isDragActive ? (
                <FileImage className="w-6 h-6" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-zinc-300">
                {isDragActive ? "Drop it" : "Drop an image here"}
              </p>
              <p className="text-xs text-zinc-600">
                or click to browse &middot; PNG, JPG, WebP, BMP, TIFF, SVG
              </p>
            </div>
          </div>
        </div>

        {/* Capabilities — understated, not a marketing grid */}
        <div className="flex items-center justify-center gap-6 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3 h-3" />
            13 map types
          </span>
          <span className="text-zinc-800">/</span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            runs locally
          </span>
          <span className="text-zinc-800">/</span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            nothing uploaded
          </span>
        </div>
      </div>
    </div>
  );
}
