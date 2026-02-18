"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { EXPORT_PRESETS, MapType, MAP_CONFIGS } from "@/types/maps";
import { MAP_ICONS } from "@/types/mapIcons";
import { imageDataToBlob } from "@/engine/algorithms";
import { getElectronAPI } from "@/types/electron";
import { zipSync, strToU8 } from "fflate";
import { cn } from "@/lib/utils";
import {
  X,
  Package,
  Check,
  Loader2,
  FileArchive,
  FolderOpen,
  ExternalLink,
} from "lucide-react";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

// ─── Channel Packing utilities ───────────────────────────────────────────────

function packChannels(
  r: ImageData | null,
  g: ImageData | null,
  b: ImageData | null,
  a: ImageData | null,
  width: number,
  height: number
): ImageData {
  const out = new ImageData(width, height);
  const len = width * height * 4;
  for (let i = 0; i < len; i += 4) {
    out.data[i] = r ? r.data[i] : 0;
    out.data[i + 1] = g ? g.data[i + 1] || g.data[i] : 0;
    out.data[i + 2] = b ? b.data[i + 2] || b.data[i] : 0;
    out.data[i + 3] = a ? a.data[i] : 255;
  }
  return out;
}

function getGrayscaleChannel(imageData: ImageData): ImageData {
  const out = new ImageData(imageData.width, imageData.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = imageData.data[i];
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  return out;
}

function resizeImageData(
  imageData: ImageData,
  newWidth: number,
  newHeight: number
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = newWidth;
  outCanvas.height = newHeight;
  const outCtx = outCanvas.getContext("2d")!;
  outCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
  return outCtx.getImageData(0, 0, newWidth, newHeight);
}

function flipNormalGreen(imageData: ImageData): ImageData {
  const out = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i + 1] = 255 - out.data[i + 1];
  }
  return out;
}

// ─── Resolution options ──────────────────────────────────────────────────────

const RESOLUTION_OPTIONS = [
  { label: "Original", scale: 1 },
  { label: "½ (50%)", scale: 0.5 },
  { label: "¼ (25%)", scale: 0.25 },
  { label: "2× (200%)", scale: 2 },
];

type ExportMode = "zip" | "folder";

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExportModal({ open, onClose }: ExportModalProps) {
  const maps = useAppStore((s) => s.maps);
  const sourceFileName = useAppStore((s) => s.sourceFileName);
  const sourceWidth = useAppStore((s) => s.sourceWidth);
  const sourceHeight = useAppStore((s) => s.sourceHeight);
  const addToast = useAppStore((s) => s.addToast);

  const [selectedPreset, setSelectedPreset] = useState(0);
  const [format, setFormat] = useState("png");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [resolutionScale, setResolutionScale] = useState(1);
  const [packORM, setPackORM] = useState(true);
  const [exportMode, setExportMode] = useState<ExportMode>("zip");
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const electronAPI = getElectronAPI();
  const isElectron = !!electronAPI;

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setLastExportPath(null);
      setExportProgress(0);
      setExporting(false);
    }
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  const preset = EXPORT_PRESETS[selectedPreset];
  const baseName = sourceFileName.replace(/\.[^.]+$/, "") || "texture";
  const isDirectX = preset.normalConvention === "directx";

  const hasAO =
    maps[MapType.AO]?.generated && maps[MapType.AO]?.imageData;
  const hasRoughness =
    maps[MapType.Roughness]?.generated && maps[MapType.Roughness]?.imageData;
  const hasMetallic =
    maps[MapType.Metallic]?.generated && maps[MapType.Metallic]?.imageData;
  const canPackORM = hasAO && hasRoughness && hasMetallic;

  // ─── Shared export logic: build all image buffers ─────────────────────────

  const buildExportFiles = async (): Promise<{
    files: { name: string; data: Uint8Array }[];
    readmeTxt: string;
    exportedNames: string[];
  }> => {
    const files: { name: string; data: Uint8Array }[] = [];
    const mapsToExport = preset.maps.filter((m) => maps[m.type]?.generated);
    const exportedNames: string[] = [];

    // Output resolution
    const refMap = mapsToExport.find((m) => maps[m.type]?.imageData);
    const refData = refMap ? maps[refMap.type].imageData! : null;
    const outWidth = refData
      ? Math.round(refData.width * resolutionScale)
      : sourceWidth;
    const outHeight = refData
      ? Math.round(refData.height * resolutionScale)
      : sourceHeight;
    const needsResize = resolutionScale !== 1;

    const saveImage = async (
      imageData: ImageData,
      fileName: string
    ) => {
      let finalData = imageData;
      if (needsResize) {
        finalData = resizeImageData(imageData, outWidth, outHeight);
      }
      const blob = await imageDataToBlob(
        finalData,
        format === "jpg" ? "image/jpeg" : "image/png"
      );
      const buffer = await blob.arrayBuffer();
      files.push({ name: fileName, data: new Uint8Array(buffer) });
    };

    const packedTypes = new Set<MapType>();

    // ORM channel packing
    if (packORM && canPackORM) {
      setExportProgress(5);
      const aoData = getGrayscaleChannel(maps[MapType.AO].imageData!);
      const roughData = getGrayscaleChannel(maps[MapType.Roughness].imageData!);
      const metalData = getGrayscaleChannel(maps[MapType.Metallic].imageData!);
      const packed = packChannels(
        aoData,
        roughData,
        metalData,
        null,
        aoData.width,
        aoData.height
      );
      const ext = format === "jpg" ? ".jpg" : ".png";
      await saveImage(packed, `${baseName}_ORM${ext}`);
      exportedNames.push(`ORM (packed): ${baseName}_ORM${ext}`);
      packedTypes.add(MapType.AO);
      packedTypes.add(MapType.Roughness);
      packedTypes.add(MapType.Metallic);
    }

    // Individual maps
    for (let i = 0; i < mapsToExport.length; i++) {
      const mapDef = mapsToExport[i];
      const map = maps[mapDef.type];
      if (!map.imageData) continue;
      if (packedTypes.has(mapDef.type)) continue;

      setExportProgress(
        Math.round(((i + 1) / mapsToExport.length) * 90) + 10
      );

      let imageData = map.imageData;
      if (mapDef.type === MapType.Normal && isDirectX) {
        imageData = flipNormalGreen(imageData);
      }

      const ext = format === "jpg" ? ".jpg" : ".png";
      const fileName = `${baseName}${mapDef.suffix}${ext}`;
      await saveImage(imageData, fileName);

      const config = MAP_CONFIGS.find((c) => c.type === mapDef.type);
      exportedNames.push(
        `${config?.label}: ${baseName}${mapDef.suffix}${ext}`
      );
    }

    const readmeTxt = `PBR Texture Maps
================
Exported with materialililil
Preset: ${preset.name}
Normal Convention: ${preset.normalConvention.toUpperCase()}
Resolution: ${outWidth}\u00d7${outHeight}${needsResize ? ` (scaled ${resolutionScale * 100}%)` : ""}
${packORM && canPackORM ? "Includes ORM channel-packed texture (R=AO, G=Roughness, B=Metallic)\n" : ""}
Notes: ${preset.notes}

Maps included:
${exportedNames.map((n) => `- ${n}`).join("\n")}
`;

    return { files, readmeTxt, exportedNames };
  };

  // ─── Export as ZIP ────────────────────────────────────────────────────────

  const handleExportZip = async () => {
    setExporting(true);
    setExportProgress(0);

    try {
      const { files, readmeTxt, exportedNames } = await buildExportFiles();

      // Build ZIP
      const zipFiles: Record<string, Uint8Array> = {};
      for (const f of files) {
        zipFiles[`${baseName}/${f.name}`] = f.data;
      }
      zipFiles[`${baseName}/README.txt`] = strToU8(readmeTxt);
      const zipped = zipSync(zipFiles, { level: 6 });
      const zipBuffer = zipped.buffer.slice(
        zipped.byteOffset,
        zipped.byteOffset + zipped.byteLength
      ) as ArrayBuffer;

      if (electronAPI) {
        // Native save dialog
        const result = await electronAPI.showSaveDialog({
          title: "Export ZIP",
          defaultPath: `${baseName}_${preset.software}.zip`,
          filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
        });

        if (result.canceled || !result.filePath) {
          setExporting(false);
          return;
        }

        const writeResult = await electronAPI.writeFile(
          result.filePath,
          zipBuffer
        );
        if (writeResult.success) {
          setLastExportPath(result.filePath);
          addToast(
            `Exported ${exportedNames.length} maps for ${preset.name}`,
            "success"
          );
        } else {
          addToast(`Export failed: ${writeResult.error}`, "error");
        }
      } else {
        // Browser fallback
        const blob = new Blob([zipBuffer], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}_${preset.software}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        addToast(
          `Exported ${exportedNames.length} maps for ${preset.name}`,
          "success"
        );
      }

      setExporting(false);
    } catch (err) {
      console.error("Export error:", err);
      addToast("Export failed — see console for details", "error");
      setExporting(false);
    }
  };

  // ─── Export to Folder (Electron only) ─────────────────────────────────────

  const handleExportFolder = async () => {
    if (!electronAPI) return;

    setExporting(true);
    setExportProgress(0);

    try {
      // Pick folder
      const dialogResult = await electronAPI.showOpenDialog({
        title: "Choose Export Folder",
        properties: ["openDirectory"],
      });

      if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
        setExporting(false);
        return;
      }

      const folderPath = dialogResult.filePaths[0];
      const { files, readmeTxt, exportedNames } = await buildExportFiles();

      // Add readme
      files.push({
        name: "README.txt",
        data: strToU8(readmeTxt),
      });

      // Write all files
      const filesForIPC = files.map((f) => ({
        name: f.name,
        data: f.data.buffer.slice(
          f.data.byteOffset,
          f.data.byteOffset + f.data.byteLength
        ) as ArrayBuffer,
      }));

      const result = await electronAPI.writeFiles(folderPath, filesForIPC);
      if (result.success) {
        setLastExportPath(folderPath);
        addToast(
          `Exported ${exportedNames.length} maps to folder`,
          "success"
        );
      } else {
        addToast(`Export failed: ${result.error}`, "error");
      }

      setExporting(false);
    } catch (err) {
      console.error("Export error:", err);
      addToast("Export failed — see console for details", "error");
      setExporting(false);
    }
  };

  const handleExport = () => {
    if (exportMode === "folder" && isElectron) {
      handleExportFolder();
    } else {
      handleExportZip();
    }
  };

  const handleRevealInFinder = () => {
    if (lastExportPath && electronAPI) {
      electronAPI.showItemInFolder(lastExportPath);
    }
  };

  const generatedCount = preset.maps.filter(
    (m) => maps[m.type]?.generated
  ).length;
  const totalCount = preset.maps.length;
  const missingMaps = preset.maps.filter((m) => !maps[m.type]?.generated);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-[90vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Export PBR Material
              </h2>
              <p className="text-xs text-zinc-500">
                Export your texture maps for use in 3D software
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Export Mode (Electron only) */}
          {isElectron && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Export To
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setExportMode("zip")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all",
                    exportMode === "zip"
                      ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                      : "border-zinc-700 hover:border-zinc-500 bg-zinc-800/50"
                  )}
                >
                  <FileArchive className="w-4 h-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      ZIP File
                    </p>
                    <p className="text-xs text-zinc-500">
                      Single archive with all maps
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setExportMode("folder")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all",
                    exportMode === "folder"
                      ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                      : "border-zinc-700 hover:border-zinc-500 bg-zinc-800/50"
                  )}
                >
                  <FolderOpen className="w-4 h-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Folder
                    </p>
                    <p className="text-xs text-zinc-500">
                      Individual files to a directory
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Preset selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Export Preset
            </label>
            <p className="text-xs text-zinc-500">
              Choose a preset matching your 3D software for correct naming
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPORT_PRESETS.map((p, i) => (
                <button
                  key={p.software}
                  onClick={() => setSelectedPreset(i)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border text-left transition-all",
                    selectedPreset === i
                      ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                      : "border-zinc-700 hover:border-zinc-500 bg-zinc-800/50"
                  )}
                >
                  <p className="text-sm font-medium text-zinc-200">
                    {p.name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {p.maps.length} maps · {p.normalConvention.toUpperCase()}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Maps included */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Maps to Export ({generatedCount}/{totalCount} ready)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {preset.maps.map((mapDef) => {
                const config = MAP_CONFIGS.find(
                  (c) => c.type === mapDef.type
                );
                const isGenerated = maps[mapDef.type]?.generated;
                return (
                  <div
                    key={mapDef.type}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                      isGenerated
                        ? "border-green-800/50 bg-green-950/20 text-green-300"
                        : "border-zinc-800 text-zinc-500"
                    )}
                  >
                    {isGenerated ? (
                      <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    ) : (
                      (() => {
                        const Icon = MAP_ICONS[mapDef.type];
                        return (
                          <Icon className="w-3.5 h-3.5 flex-shrink-0 text-zinc-600" />
                        );
                      })()
                    )}
                    <span className="truncate">{config?.label}</span>
                    <span className="text-xs text-zinc-600 ml-auto flex-shrink-0">
                      {mapDef.suffix}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Format + Resolution + Options */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="png">PNG (lossless)</option>
                <option value="jpg">JPEG (lossy)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Resolution
              </label>
              <select
                value={resolutionScale}
                onChange={(e) =>
                  setResolutionScale(Number(e.target.value))
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                {RESOLUTION_OPTIONS.map((opt) => (
                  <option key={opt.scale} value={opt.scale}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Channel Packing
              </label>
              <label
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors",
                  packORM
                    ? "border-amber-600/50 bg-amber-500/10 text-amber-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                )}
              >
                <input
                  type="checkbox"
                  checked={packORM}
                  onChange={(e) => setPackORM(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                    packORM
                      ? "bg-amber-500 border-amber-400"
                      : "border-zinc-600"
                  )}
                >
                  {packORM && (
                    <Check className="w-2.5 h-2.5 text-white" />
                  )}
                </div>
                ORM Pack
              </label>
            </div>
          </div>

          {/* Info box */}
          <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-1.5">
            <p className="text-xs text-zinc-400">
              <strong className="text-zinc-300">Normal:</strong>{" "}
              {preset.normalConvention.toUpperCase()}
              {isDirectX &&
                " \u2014 Green channel will be flipped for DirectX convention"}
            </p>
            {packORM && canPackORM && (
              <p className="text-xs text-amber-400">
                <strong>ORM:</strong> Channel-packed texture will be
                included (R=AO, G=Roughness, B=Metallic)
              </p>
            )}
            {packORM && !canPackORM && (
              <p className="text-xs text-amber-400">
                ORM packing requires AO, Roughness, and Metallic maps to
                be generated
              </p>
            )}
            <p className="text-xs text-zinc-500">{preset.notes}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {lastExportPath ? (
              <button
                onClick={handleRevealInFinder}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Reveal in Finder
              </button>
            ) : (
              <>
                <p className="text-xs text-zinc-500">
                  {generatedCount === 0
                    ? "Generate maps first before exporting"
                    : generatedCount < totalCount
                    ? `${generatedCount}/${totalCount} maps ready`
                    : `${generatedCount} maps will be exported`}
                </p>
                {missingMaps.length > 0 && (
                  <button
                    onClick={async () => {
                      const generateSelectedMaps =
                        useAppStore.getState().generateSelectedMaps;
                      await generateSelectedMaps(
                        missingMaps.map((m) => m.type)
                      );
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-md text-amber-300 hover:bg-amber-600/10 border border-amber-500/30 transition-colors"
                  >
                    Generate {missingMaps.length} Missing
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || generatedCount === 0}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              "bg-amber-500 text-black hover:bg-amber-400",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting {exportProgress}%
              </>
            ) : exportMode === "folder" && isElectron ? (
              <>
                <FolderOpen className="w-4 h-4" />
                Export to Folder
              </>
            ) : (
              <>
                <FileArchive className="w-4 h-4" />
                Export ZIP
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
