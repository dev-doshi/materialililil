"use client";

import React, { useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { validatePBR, MapType } from "@/types/maps";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PBRValidation() {
  const maps = useAppStore((s) => s.maps);

  const issues = useMemo(() => {
    const mapData: Record<string, { imageData: ImageData | null; generated: boolean }> = {};
    for (const type of Object.values(MapType)) {
      mapData[type] = {
        imageData: maps[type].imageData,
        generated: maps[type].generated,
      };
    }
    return validatePBR(mapData as Record<MapType, { imageData: ImageData | null; generated: boolean }>);
  }, [maps]);

  const hasGeneratedMaps = Object.values(MapType).some((t) => maps[t].generated);

  if (!hasGeneratedMaps) {
    return (
      <div className="p-3 text-center">
        <p className="text-xs text-zinc-500">Generate maps to see PBR validation results</p>
      </div>
    );
  }

  const errorCount = issues.filter((c) => c.type === "error").length;
  const warnCount = issues.filter((c) => c.type === "warning").length;
  const isValid = issues.length === 0;

  return (
    <div className="space-y-2 p-2">
      {/* Summary */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        {isValid ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        )}
        <span className="text-xs font-medium text-zinc-300">
          {isValid ? "PBR values look correct" : `${issues.length} issue${issues.length !== 1 ? "s" : ""} found`}
        </span>
        <div className="flex items-center gap-1 ml-auto text-[10px] text-zinc-500">
          {isValid && <span className="text-green-500">All checks pass</span>}
          {warnCount > 0 && <span className="text-amber-500">{warnCount} warn</span>}
          {errorCount > 0 && <span className="text-red-500">{errorCount} err</span>}
        </div>
      </div>

      {/* Individual issues */}
      {issues.length > 0 && (
        <div className="space-y-1">
          {issues.map((issue, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-2 px-2.5 py-2 rounded-md border text-xs",
                issue.type === "warning" && "border-amber-900/30 bg-amber-950/10 text-amber-300",
                issue.type === "error" && "border-red-900/30 bg-red-950/10 text-red-300"
              )}
            >
              <AlertTriangle className={cn(
                "w-3.5 h-3.5 mt-0.5 flex-shrink-0",
                issue.type === "warning" ? "text-amber-500" : "text-red-500"
              )} />
              <div>
                <p className="font-medium">{issue.map} Map</p>
                <p className="text-zinc-400 mt-0.5">{issue.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isValid && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-green-900/30 bg-green-950/10 text-xs text-green-300">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-500" />
          <span>Diffuse brightness, metallic binary, roughness range, and normal blue channel all pass checks.</span>
        </div>
      )}

      {/* Guide */}
      <div className="flex items-start gap-2 px-2.5 py-2 rounded-md bg-zinc-800/50 border border-zinc-700/50">
        <Info className="w-3.5 h-3.5 mt-0.5 text-zinc-500 flex-shrink-0" />
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          PBR validation checks if your maps follow physically-based rendering guidelines.
          Diffuse albedo should stay between 30-243 sRGB. Metallic maps should be mostly black or white.
          Roughness should rarely hit 0 (perfect mirror). Normal blue channel should average around 230+.
        </p>
      </div>
    </div>
  );
}
