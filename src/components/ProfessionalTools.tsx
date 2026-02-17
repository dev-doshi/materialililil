"use client";

import React, { useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import {
  Layers,
  Palette,
  ScanLine,
  Cpu,
  Sparkles,
  Grid3X3,
  Sigma,
  Droplets,
  Blend,
  Sliders,
  CircleDot,
  BarChart3,
  Paintbrush,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  SunMedium,
  Waves,
  ChevronDown,
  ChevronRight,
  Contrast,
  Focus,
  Eclipse,
  Aperture,
  Shapes,
  ArrowUpDown,
  Shrink,
} from "lucide-react";
import {
  morphologicalDilate,
  morphologicalErode,
  morphologicalOpen,
  morphologicalClose,
  histogramEqualization,
  clahe,
  frequencySeparation,
  computeTextureComplexity,
  computeSeamScore,
  extractColorPalette,
  autoWhiteBalance,
  computeTextureStats,
  computeSeamHeatmap,
  posterize,
  channelMix,
  applyGradientMap,
  makeSeamless,
  emboss,
  generateNoise,
  hslAdjust,
  desaturate,
  bilateralFilterColor,
  medianFilterColor,
  addNoise,
  invertColors,
  unsharpMask,
  vignette,
  renormalizeNormalMap,
  flipNormalY,
} from "@/engine/professionalTools";
import {
  toGrayscale,
  grayscaleToImageData,
  imageDataToDataUrl,
} from "@/engine/algorithms";

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function ToolSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const IconComp = Icon as React.ComponentType<{ className?: string }>;

  return (
    <div className="border border-zinc-800/60 rounded-lg overflow-hidden bg-zinc-900/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/40"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-500 flex-shrink-0" />
        )}
        <IconComp className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
        <span className="text-xs font-medium text-zinc-300 flex-1">{title}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
            {badge}
          </span>
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-zinc-800/40 pt-2.5">
          {children}
        </div>
      )}
    </div>
  );
}

function SmallSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <label className="text-[11px] text-zinc-500">{label}</label>
        <span className="text-[10px] text-zinc-600 font-mono">
          {value.toFixed(step < 1 ? 1 : 0)}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer bg-zinc-700/60"
      />
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled = false,
  variant = "default",
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "destructive";
  icon?: React.ElementType;
}) {
  const IconComp = Icon as React.ComponentType<{ className?: string }> | undefined;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors",
        variant === "primary" && "bg-amber-500/80 text-black hover:bg-amber-500",
        variant === "destructive" && "bg-red-600/20 text-red-400 hover:bg-red-600/30",
        variant === "default" && "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
        "disabled:opacity-40 disabled:cursor-not-allowed"
      )}
    >
      {IconComp && <IconComp className="w-3 h-3" />}
      {label}
    </button>
  );
}

// ─── Texture Analysis Tool ────────────────────────────────────────────────────
function TextureAnalysis() {
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const [analysis, setAnalysis] = useState<{
    complexity?: ReturnType<typeof computeTextureComplexity>;
    seam?: ReturnType<typeof computeSeamScore>;
    stats?: ReturnType<typeof computeTextureStats>;
  }>({});

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const runAnalysis = useCallback(() => {
    if (!imageData) return;
    const complexity = computeTextureComplexity(imageData);
    const seam = computeSeamScore(imageData);
    const stats = computeTextureStats(imageData);
    setAnalysis({ complexity, seam, stats });
  }, [imageData]);

  return (
    <ToolSection title="Texture Analysis" icon={ScanLine} badge="Pro">
      <ActionButton
        label="Analyze Texture"
        onClick={runAnalysis}
        disabled={!imageData}
        variant="primary"
        icon={Cpu}
      />
      {analysis.complexity && (
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Complexity</span>
            <span className="text-zinc-300 font-mono">{analysis.complexity.complexity}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
              style={{ width: `${analysis.complexity.complexity}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 italic">{analysis.complexity.detail}</p>
        </div>
      )}
      {analysis.seam && (
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Tileability Score</span>
            <span
              className={cn(
                "font-mono font-medium",
                analysis.seam.score > 80 ? "text-green-400" :
                analysis.seam.score > 50 ? "text-yellow-400" : "text-red-400"
              )}
            >
              {analysis.seam.score}%
            </span>
          </div>
          <div className="flex gap-2 text-[10px] text-zinc-500">
            <span>H: {analysis.seam.horizontalScore}%</span>
            <span>V: {analysis.seam.verticalScore}%</span>
          </div>
          <ActionButton
            label="Show Seam Heatmap"
            onClick={() => {
              if (!imageData || !selectedMap) return;
              const heatmap = computeSeamHeatmap(imageData);
              const dataUrl = imageDataToDataUrl(heatmap);
              // Display the heatmap as the current map's dataUrl for quick visualization
              useAppStore.getState().updateMapParams(selectedMap, {});
              const maps = useAppStore.getState().maps;
              useAppStore.setState({
                maps: {
                  ...maps,
                  [selectedMap]: { ...maps[selectedMap], dataUrl, imageData: heatmap },
                },
              });
            }}
            disabled={!imageData || !selectedMap}
            variant="default"
            icon={ScanLine}
          />
        </div>
      )}
      {analysis.stats && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <div className="flex justify-between text-zinc-500">
            <span>Entropy</span>
            <span className="text-zinc-400 font-mono">{analysis.stats.entropy}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Energy</span>
            <span className="text-zinc-400 font-mono">{analysis.stats.energy}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Contrast</span>
            <span className="text-zinc-400 font-mono">{analysis.stats.contrast}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Homogeneity</span>
            <span className="text-zinc-400 font-mono">{analysis.stats.homogeneity}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Mean Lum.</span>
            <span className="text-zinc-400 font-mono">{analysis.stats.meanLuminance}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Dynamic Range</span>
            <span className="text-zinc-400 font-mono">{analysis.stats.dynamicRange}</span>
          </div>
        </div>
      )}
    </ToolSection>
  );
}

// ─── Color Palette Extraction ─────────────────────────────────────────────────
function PaletteExtractor() {
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const [palette, setPalette] = useState<ReturnType<typeof extractColorPalette>>([]);
  const [numColors, setNumColors] = useState(6);

  const extract = useCallback(() => {
    if (!sourceImageData) return;
    setPalette(extractColorPalette(sourceImageData, numColors));
  }, [sourceImageData, numColors]);

  return (
    <ToolSection title="Color Palette Extraction" icon={Palette}>
      <SmallSlider label="Colors" value={numColors} min={3} max={12} step={1} onChange={setNumColors} />
      <ActionButton label="Extract Palette" onClick={extract} disabled={!sourceImageData} variant="primary" icon={Droplets} />
      {palette.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {palette.map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-7 h-7 rounded border border-zinc-700"
                  style={{ backgroundColor: c.hex }}
                  title={`${c.hex} (${c.percentage}%)`}
                />
                <span className="text-[8px] text-zinc-600 font-mono">{c.percentage}%</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {palette.map((c, i) => (
              <button
                key={i}
                onClick={() => navigator.clipboard.writeText(c.hex)}
                className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 px-1 py-0.5 rounded cursor-pointer"
                title="Click to copy"
              >
                {c.hex}
              </button>
            ))}
          </div>
        </div>
      )}
    </ToolSection>
  );
}

// ─── Filter Tools ─────────────────────────────────────────────────────────────
function FilterTools() {
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const [bilateralSpatial, setBilateralSpatial] = useState(3);
  const [bilateralRange, setBilateralRange] = useState(30);
  const [medianRadius, setMedianRadius] = useState(1);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const applyBilateral = useCallback(() => {
    if (!imageData) return;
    const output = bilateralFilterColor(imageData, bilateralSpatial, bilateralRange);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
      useAppStore.getState().saveHistory();
    }
  }, [imageData, bilateralSpatial, bilateralRange, selectedMap]);

  const applyMedian = useCallback(() => {
    if (!imageData) return;
    const output = medianFilterColor(imageData, medianRadius);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
      useAppStore.getState().saveHistory();
    }
  }, [imageData, medianRadius, selectedMap]);

  return (
    <ToolSection title="Advanced Filters" icon={Blend} badge="Pro">
      <div className="space-y-2">
        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Bilateral (Edge-Preserving)</p>
        <SmallSlider label="Spatial σ" value={bilateralSpatial} min={1} max={10} step={0.5} onChange={setBilateralSpatial} />
        <SmallSlider label="Range σ" value={bilateralRange} min={5} max={100} step={5} onChange={setBilateralRange} />
        <ActionButton label="Apply Bilateral" onClick={applyBilateral} disabled={!imageData || !selectedMap} icon={Blend} />
      </div>
      <div className="border-t border-zinc-800/40 my-1" />
      <div className="space-y-2">
        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Median (Noise Reduction)</p>
        <SmallSlider label="Radius" value={medianRadius} min={1} max={5} step={1} onChange={setMedianRadius} suffix="px" />
        <ActionButton label="Apply Median" onClick={applyMedian} disabled={!imageData || !selectedMap} icon={CircleDot} />
      </div>
    </ToolSection>
  );
}

// ─── Morphological Operations ─────────────────────────────────────────────────
function MorphologyTools() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const [radius, setRadius] = useState(1);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : null;

  const applyOp = useCallback(
    (op: "dilate" | "erode" | "open" | "close") => {
      if (!imageData || !selectedMap) return;
      const gray = toGrayscale(imageData);
      let result: Float32Array;
      switch (op) {
        case "dilate": result = morphologicalDilate(gray, imageData.width, imageData.height, radius); break;
        case "erode": result = morphologicalErode(gray, imageData.width, imageData.height, radius); break;
        case "open": result = morphologicalOpen(gray, imageData.width, imageData.height, radius); break;
        case "close": result = morphologicalClose(gray, imageData.width, imageData.height, radius); break;
      }
      const output = grayscaleToImageData(result, imageData.width, imageData.height);
      const dataUrl = imageDataToDataUrl(output);
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
      useAppStore.getState().saveHistory();
    },
    [imageData, selectedMap, radius]
  );

  return (
    <ToolSection title="Morphological Ops" icon={Grid3X3}>
      <SmallSlider label="Radius" value={radius} min={1} max={5} step={1} onChange={setRadius} suffix="px" />
      <div className="grid grid-cols-2 gap-1.5">
        <ActionButton label="Dilate" onClick={() => applyOp("dilate")} disabled={!imageData || !selectedMap} />
        <ActionButton label="Erode" onClick={() => applyOp("erode")} disabled={!imageData || !selectedMap} />
        <ActionButton label="Open" onClick={() => applyOp("open")} disabled={!imageData || !selectedMap} />
        <ActionButton label="Close" onClick={() => applyOp("close")} disabled={!imageData || !selectedMap} />
      </div>
    </ToolSection>
  );
}

// ─── Contrast Enhancement ─────────────────────────────────────────────────────
function ContrastTools() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const [claheTileSize, setClaheTileSize] = useState(32);
  const [claheClip, setClaheClip] = useState(3.0);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : null;

  const applyHistEq = useCallback(() => {
    if (!imageData || !selectedMap) return;
    const gray = toGrayscale(imageData);
    const result = histogramEqualization(gray, imageData.width, imageData.height);
    const output = grayscaleToImageData(result, imageData.width, imageData.height);
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState((s) => ({
      maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
    }));
    useAppStore.getState().saveHistory();
  }, [imageData, selectedMap]);

  const applyClahe = useCallback(() => {
    if (!imageData || !selectedMap) return;
    const gray = toGrayscale(imageData);
    const result = clahe(gray, imageData.width, imageData.height, claheTileSize, claheClip);
    const output = grayscaleToImageData(result, imageData.width, imageData.height);
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState((s) => ({
      maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
    }));
    useAppStore.getState().saveHistory();
  }, [imageData, selectedMap, claheTileSize, claheClip]);

  return (
    <ToolSection title="Contrast Enhancement" icon={Sliders}>
      <ActionButton label="Histogram Equalization" onClick={applyHistEq} disabled={!imageData || !selectedMap} icon={BarChart3} />
      <div className="border-t border-zinc-800/40 my-1" />
      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">CLAHE (Adaptive)</p>
      <SmallSlider label="Tile Size" value={claheTileSize} min={8} max={64} step={8} onChange={setClaheTileSize} suffix="px" />
      <SmallSlider label="Clip Limit" value={claheClip} min={1} max={10} step={0.5} onChange={setClaheClip} />
      <ActionButton label="Apply CLAHE" onClick={applyClahe} disabled={!imageData || !selectedMap} variant="primary" icon={Sigma} />
    </ToolSection>
  );
}

// ─── Frequency Separation ─────────────────────────────────────────────────────
function FrequencySepTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const [sigma, setSigma] = useState(5);
  const [showLayer, setShowLayer] = useState<"low" | "high">("low");

  const imageData = selectedMap ? maps[selectedMap]?.imageData : null;

  const apply = useCallback(() => {
    if (!imageData || !selectedMap) return;
    const gray = toGrayscale(imageData);
    const { low, high } = frequencySeparation(gray, imageData.width, imageData.height, sigma);
    const result = showLayer === "low" ? low : high;
    const output = grayscaleToImageData(result, imageData.width, imageData.height);
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState((s) => ({
      maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
    }));
    useAppStore.getState().saveHistory();
  }, [imageData, selectedMap, sigma, showLayer]);

  return (
    <ToolSection title="Frequency Separation" icon={Waves}>
      <SmallSlider label="Blur Sigma" value={sigma} min={1} max={20} step={1} onChange={setSigma} />
      <div className="flex gap-1">
        <button
          onClick={() => setShowLayer("low")}
          className={cn(
            "flex-1 text-[10px] py-1 rounded",
            showLayer === "low" ? "bg-amber-500/30 text-amber-300" : "bg-zinc-800 text-zinc-500"
          )}
        >
          Low Freq
        </button>
        <button
          onClick={() => setShowLayer("high")}
          className={cn(
            "flex-1 text-[10px] py-1 rounded",
            showLayer === "high" ? "bg-amber-500/30 text-amber-300" : "bg-zinc-800 text-zinc-500"
          )}
        >
          High Freq
        </button>
      </div>
      <ActionButton label="Extract Layer" onClick={apply} disabled={!imageData || !selectedMap} variant="primary" icon={Layers} />
    </ToolSection>
  );
}

// ─── Auto White Balance ───────────────────────────────────────────────────────
function AutoCorrectionTools() {
  const sourceImageData = useAppStore((s) => s.sourceImageData);

  const applyAutoWB = useCallback(() => {
    if (!sourceImageData) return;
    const output = autoWhiteBalance(sourceImageData);
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState({
      sourceImageData: output,
      sourceDataUrl: dataUrl,
    });
    useAppStore.getState().saveHistory();
  }, [sourceImageData]);

  return (
    <ToolSection title="Auto Correction" icon={SunMedium}>
      <ActionButton label="Auto White Balance" onClick={applyAutoWB} disabled={!sourceImageData} variant="primary" icon={SunMedium} />
      <p className="text-[10px] text-zinc-500">Applies Gray World hypothesis to correct color cast on the source image.</p>
    </ToolSection>
  );
}

// ─── Transform Tools ──────────────────────────────────────────────────────────
function TransformTools() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : null;

  const flipH = useCallback(() => {
    if (!imageData || !selectedMap) return;
    const { width, height, data: srcData } = imageData;
    const output = new ImageData(width, height);
    const { data } = output;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = (y * width + (width - 1 - x)) * 4;
        data[dstIdx] = srcData[srcIdx];
        data[dstIdx + 1] = srcData[srcIdx + 1];
        data[dstIdx + 2] = srcData[srcIdx + 2];
        data[dstIdx + 3] = srcData[srcIdx + 3];
      }
    }
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState((s) => ({
      maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
    }));
    useAppStore.getState().saveHistory();
  }, [imageData, selectedMap]);

  const flipV = useCallback(() => {
    if (!imageData || !selectedMap) return;
    const { width, height, data: srcData } = imageData;
    const output = new ImageData(width, height);
    const { data } = output;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = ((height - 1 - y) * width + x) * 4;
        data[dstIdx] = srcData[srcIdx];
        data[dstIdx + 1] = srcData[srcIdx + 1];
        data[dstIdx + 2] = srcData[srcIdx + 2];
        data[dstIdx + 3] = srcData[srcIdx + 3];
      }
    }
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState((s) => ({
      maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
    }));
    useAppStore.getState().saveHistory();
  }, [imageData, selectedMap]);

  const rotate90 = useCallback(() => {
    if (!imageData || !selectedMap) return;
    const { width, height, data: srcData } = imageData;
    const output = new ImageData(height, width);
    const { data } = output;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = (x * height + (height - 1 - y)) * 4;
        data[dstIdx] = srcData[srcIdx];
        data[dstIdx + 1] = srcData[srcIdx + 1];
        data[dstIdx + 2] = srcData[srcIdx + 2];
        data[dstIdx + 3] = srcData[srcIdx + 3];
      }
    }
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState((s) => ({
      maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
    }));
    useAppStore.getState().saveHistory();
  }, [imageData, selectedMap]);

  return (
    <ToolSection title="Transform" icon={FlipHorizontal}>
      <div className="grid grid-cols-3 gap-1.5">
        <ActionButton label="Flip H" onClick={flipH} disabled={!imageData || !selectedMap} icon={FlipHorizontal} />
        <ActionButton label="Flip V" onClick={flipV} disabled={!imageData || !selectedMap} icon={FlipVertical} />
        <ActionButton label="90° CW" onClick={rotate90} disabled={!imageData || !selectedMap} icon={RotateCw} />
      </div>
    </ToolSection>
  );
}

// ─── Make Seamless Tool ───────────────────────────────────────────────────────
function SeamlessTool() {
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const [blendWidth, setBlendWidth] = useState(0.2);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const apply = useCallback(() => {
    if (!imageData) return;
    const output = makeSeamless(imageData, blendWidth);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
    } else {
      useAppStore.setState({ sourceImageData: output, sourceDataUrl: dataUrl });
    }
    useAppStore.getState().saveHistory();
  }, [imageData, blendWidth, selectedMap]);

  return (
    <ToolSection title="Make Seamless" icon={Grid3X3} badge="Tiling" defaultOpen>
      <p className="text-[10px] text-zinc-500">Cross-blend edges to create seamlessly tileable textures.</p>
      <SmallSlider label="Blend Width" value={blendWidth} min={0.05} max={0.45} step={0.05} onChange={setBlendWidth} suffix="" />
      <ActionButton label="Make Seamless" onClick={apply} disabled={!imageData} variant="primary" icon={Grid3X3} />
    </ToolSection>
  );
}

// ─── HSL Adjustment Tool ──────────────────────────────────────────────────────
function HSLTool() {
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(1.0);
  const [light, setLight] = useState(1.0);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const apply = useCallback(() => {
    if (!imageData) return;
    const output = hslAdjust(imageData, hue, sat, light);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
    } else {
      useAppStore.setState({ sourceImageData: output, sourceDataUrl: dataUrl });
    }
    useAppStore.getState().saveHistory();
  }, [imageData, hue, sat, light, selectedMap]);

  return (
    <ToolSection title="HSL Adjustment" icon={Palette}>
      <SmallSlider label="Hue Shift" value={hue} min={-180} max={180} step={5} onChange={setHue} suffix="°" />
      <SmallSlider label="Saturation" value={sat} min={0} max={2} step={0.05} onChange={setSat} suffix="×" />
      <SmallSlider label="Lightness" value={light} min={0} max={2} step={0.05} onChange={setLight} suffix="×" />
      <ActionButton label="Apply HSL" onClick={apply} disabled={!imageData} variant="primary" icon={Palette} />
    </ToolSection>
  );
}

// ─── Desaturate Tool ──────────────────────────────────────────────────────────
function DesaturateTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const [method, setMethod] = useState<"luminance" | "average" | "lightness" | "max">("luminance");
  const [amount, setAmount] = useState(1.0);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const apply = useCallback(() => {
    if (!imageData) return;
    const output = desaturate(imageData, method, amount);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
    } else {
      useAppStore.setState({ sourceImageData: output, sourceDataUrl: dataUrl });
    }
    useAppStore.getState().saveHistory();
  }, [imageData, method, amount, selectedMap]);

  return (
    <ToolSection title="Desaturate" icon={Eclipse}>
      <div className="flex flex-wrap gap-1">
        {(["luminance", "average", "lightness", "max"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded capitalize",
              method === m ? "bg-amber-500/30 text-amber-300" : "bg-zinc-800 text-zinc-500"
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <SmallSlider label="Amount" value={amount} min={0} max={1} step={0.05} onChange={setAmount} />
      <ActionButton label="Desaturate" onClick={apply} disabled={!imageData} icon={Eclipse} />
    </ToolSection>
  );
}

// ─── Invert Colors ────────────────────────────────────────────────────────────
function InvertTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const apply = useCallback(() => {
    if (!imageData) return;
    const output = invertColors(imageData);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
    } else {
      useAppStore.setState({ sourceImageData: output, sourceDataUrl: dataUrl });
    }
    useAppStore.getState().saveHistory();
  }, [imageData, selectedMap]);

  return (
    <ToolSection title="Invert Colors" icon={Contrast}>
      <ActionButton label="Invert" onClick={apply} disabled={!imageData} icon={Contrast} />
    </ToolSection>
  );
}

// ─── Posterize Tool ───────────────────────────────────────────────────────────
function PosterizeTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const [levels, setLevels] = useState(4);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : null;

  const apply = useCallback(() => {
    if (!imageData || !selectedMap) return;
    const output = posterize(imageData, levels);
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState((s) => ({
      maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
    }));
    useAppStore.getState().saveHistory();
  }, [imageData, levels, selectedMap]);

  return (
    <ToolSection title="Posterize" icon={Layers}>
      <SmallSlider label="Levels" value={levels} min={2} max={16} step={1} onChange={setLevels} />
      <ActionButton label="Posterize" onClick={apply} disabled={!imageData || !selectedMap} icon={Layers} />
    </ToolSection>
  );
}

// ─── Channel Mixer Tool ──────────────────────────────────────────────────────
function ChannelMixerTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const [rr, setRR] = useState(1); const [rg, setRG] = useState(0); const [rb, setRB] = useState(0);
  const [gr, setGR] = useState(0); const [gg, setGG] = useState(1); const [gb, setGB] = useState(0);
  const [br, setBR] = useState(0); const [bg_, setBG] = useState(0); const [bb, setBB] = useState(1);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const apply = useCallback(() => {
    if (!imageData) return;
    const output = channelMix(imageData, [rr, rg, rb], [gr, gg, gb], [br, bg_, bb]);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
    } else {
      useAppStore.setState({ sourceImageData: output, sourceDataUrl: dataUrl });
    }
    useAppStore.getState().saveHistory();
  }, [imageData, rr, rg, rb, gr, gg, gb, br, bg_, bb, selectedMap]);

  return (
    <ToolSection title="Channel Mixer" icon={Sliders}>
      <p className="text-[10px] text-zinc-500 font-medium text-red-400/70">Red Output</p>
      <div className="grid grid-cols-3 gap-1">
        <SmallSlider label="R" value={rr} min={-1} max={2} step={0.1} onChange={setRR} />
        <SmallSlider label="G" value={rg} min={-1} max={2} step={0.1} onChange={setRG} />
        <SmallSlider label="B" value={rb} min={-1} max={2} step={0.1} onChange={setRB} />
      </div>
      <p className="text-[10px] text-zinc-500 font-medium text-green-400/70">Green Output</p>
      <div className="grid grid-cols-3 gap-1">
        <SmallSlider label="R" value={gr} min={-1} max={2} step={0.1} onChange={setGR} />
        <SmallSlider label="G" value={gg} min={-1} max={2} step={0.1} onChange={setGG} />
        <SmallSlider label="B" value={gb} min={-1} max={2} step={0.1} onChange={setGB} />
      </div>
      <p className="text-[10px] text-zinc-500 font-medium text-blue-400/70">Blue Output</p>
      <div className="grid grid-cols-3 gap-1">
        <SmallSlider label="R" value={br} min={-1} max={2} step={0.1} onChange={setBR} />
        <SmallSlider label="G" value={bg_} min={-1} max={2} step={0.1} onChange={setBG} />
        <SmallSlider label="B" value={bb} min={-1} max={2} step={0.1} onChange={setBB} />
      </div>
      <ActionButton label="Apply Mix" onClick={apply} disabled={!imageData} variant="primary" icon={Sliders} />
    </ToolSection>
  );
}

// ─── Unsharp Mask Tool ───────────────────────────────────────────────────────
function UnsharpMaskTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const [radius, setRadius] = useState(2);
  const [amount, setAmount] = useState(1.5);
  const [threshold, setThreshold] = useState(0);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const apply = useCallback(() => {
    if (!imageData) return;
    const output = unsharpMask(imageData, radius, amount, threshold);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
    } else {
      useAppStore.setState({ sourceImageData: output, sourceDataUrl: dataUrl });
    }
    useAppStore.getState().saveHistory();
  }, [imageData, radius, amount, threshold, selectedMap]);

  return (
    <ToolSection title="Unsharp Mask" icon={Focus}>
      <SmallSlider label="Radius" value={radius} min={1} max={10} step={1} onChange={setRadius} suffix="px" />
      <SmallSlider label="Amount" value={amount} min={0.1} max={5} step={0.1} onChange={setAmount} suffix="×" />
      <SmallSlider label="Threshold" value={threshold} min={0} max={50} step={1} onChange={setThreshold} />
      <ActionButton label="Apply Unsharp" onClick={apply} disabled={!imageData} icon={Focus} />
    </ToolSection>
  );
}

// ─── Add Noise Tool ──────────────────────────────────────────────────────────
function AddNoiseTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const [noiseAmount, setNoiseAmount] = useState(10);
  const [monochrome, setMonochrome] = useState(true);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const apply = useCallback(() => {
    if (!imageData) return;
    const output = addNoise(imageData, noiseAmount, monochrome);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
    } else {
      useAppStore.setState({ sourceImageData: output, sourceDataUrl: dataUrl });
    }
    useAppStore.getState().saveHistory();
  }, [imageData, noiseAmount, monochrome, selectedMap]);

  return (
    <ToolSection title="Add Noise" icon={Sparkles}>
      <SmallSlider label="Amount" value={noiseAmount} min={1} max={80} step={1} onChange={setNoiseAmount} suffix="%" />
      <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer">
        <input
          type="checkbox"
          checked={monochrome}
          onChange={(e) => setMonochrome(e.target.checked)}
          className="rounded border-zinc-600 bg-zinc-800 w-3 h-3"
        />
        Monochrome
      </label>
      <ActionButton label="Add Noise" onClick={apply} disabled={!imageData} icon={Sparkles} />
    </ToolSection>
  );
}

// ─── Noise Generator Tool ────────────────────────────────────────────────────
function NoiseGeneratorTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const [noiseType, setNoiseType] = useState<"white" | "perlin">("perlin");
  const [scale, setScale] = useState(50);
  const [seed, setSeed] = useState(42);

  const apply = useCallback(() => {
    const w = sourceImageData?.width ?? 512;
    const h = sourceImageData?.height ?? 512;
    const gray = generateNoise(w, h, noiseType, scale, seed);
    const output = grayscaleToImageData(gray, w, h);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
      useAppStore.getState().saveHistory();
    }
  }, [sourceImageData, noiseType, scale, seed, selectedMap]);

  return (
    <ToolSection title="Noise Generator" icon={Shapes}>
      <div className="flex gap-1">
        {(["white", "perlin"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setNoiseType(t)}
            className={cn(
              "flex-1 text-[10px] py-1 rounded capitalize",
              noiseType === t ? "bg-amber-500/30 text-amber-300" : "bg-zinc-800 text-zinc-500"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <SmallSlider label="Scale" value={scale} min={5} max={200} step={5} onChange={setScale} />
      <SmallSlider label="Seed" value={seed} min={1} max={999} step={1} onChange={setSeed} />
      <ActionButton label="Generate Noise" onClick={apply} disabled={!selectedMap} variant="primary" icon={Shapes} />
    </ToolSection>
  );
}

// ─── Emboss Tool ──────────────────────────────────────────────────────────────
function EmbossTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const [strength, setStrength] = useState(1.0);
  const [angle, setAngle] = useState(135);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : null;

  const apply = useCallback(() => {
    if (!imageData || !selectedMap) return;
    const gray = toGrayscale(imageData);
    const result = emboss(gray, imageData.width, imageData.height, strength, angle);
    const output = grayscaleToImageData(result, imageData.width, imageData.height);
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState((s) => ({
      maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
    }));
    useAppStore.getState().saveHistory();
  }, [imageData, strength, angle, selectedMap]);

  return (
    <ToolSection title="Emboss" icon={Aperture}>
      <SmallSlider label="Strength" value={strength} min={0.5} max={5} step={0.5} onChange={setStrength} />
      <SmallSlider label="Angle" value={angle} min={0} max={360} step={45} onChange={setAngle} suffix="°" />
      <ActionButton label="Apply Emboss" onClick={apply} disabled={!imageData || !selectedMap} icon={Aperture} />
    </ToolSection>
  );
}

// ─── Vignette Tool ────────────────────────────────────────────────────────────
function VignetteTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const [vigAmount, setVigAmount] = useState(0.5);
  const [vigRadius, setVigRadius] = useState(0.7);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const apply = useCallback(() => {
    if (!imageData) return;
    const output = vignette(imageData, vigAmount, vigRadius);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
    } else {
      useAppStore.setState({ sourceImageData: output, sourceDataUrl: dataUrl });
    }
    useAppStore.getState().saveHistory();
  }, [imageData, vigAmount, vigRadius, selectedMap]);

  return (
    <ToolSection title="Vignette" icon={Shrink}>
      <SmallSlider label="Amount" value={vigAmount} min={0} max={1} step={0.05} onChange={setVigAmount} />
      <SmallSlider label="Start Radius" value={vigRadius} min={0.3} max={1} step={0.05} onChange={setVigRadius} />
      <ActionButton label="Apply Vignette" onClick={apply} disabled={!imageData} icon={Shrink} />
    </ToolSection>
  );
}

// ─── Gradient Map Tool ────────────────────────────────────────────────────────
function GradientMapTool() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const [preset, setPreset] = useState<string>("heat");

  const presets: Record<string, Array<{ stop: number; r: number; g: number; b: number }>> = {
    heat: [
      { stop: 0, r: 0, g: 0, b: 0 },
      { stop: 0.25, r: 128, g: 0, b: 0 },
      { stop: 0.5, r: 255, g: 128, b: 0 },
      { stop: 0.75, r: 255, g: 255, b: 64 },
      { stop: 1, r: 255, g: 255, b: 255 },
    ],
    cool: [
      { stop: 0, r: 0, g: 0, b: 32 },
      { stop: 0.25, r: 0, g: 64, b: 128 },
      { stop: 0.5, r: 64, g: 192, b: 255 },
      { stop: 0.75, r: 200, g: 255, b: 255 },
      { stop: 1, r: 255, g: 255, b: 255 },
    ],
    sepia: [
      { stop: 0, r: 0, g: 0, b: 0 },
      { stop: 0.25, r: 60, g: 30, b: 15 },
      { stop: 0.5, r: 150, g: 100, b: 60 },
      { stop: 0.75, r: 210, g: 180, b: 140 },
      { stop: 1, r: 255, g: 245, b: 230 },
    ],
    terrain: [
      { stop: 0, r: 0, g: 0, b: 128 },
      { stop: 0.25, r: 0, g: 128, b: 64 },
      { stop: 0.5, r: 128, g: 200, b: 0 },
      { stop: 0.75, r: 200, g: 160, b: 80 },
      { stop: 1, r: 255, g: 255, b: 255 },
    ],
  };

  const imageData = selectedMap ? maps[selectedMap]?.imageData : sourceImageData;

  const apply = useCallback(() => {
    if (!imageData) return;
    const colors = presets[preset] || presets.heat;
    const output = applyGradientMap(imageData, colors);
    const dataUrl = imageDataToDataUrl(output);
    if (selectedMap) {
      useAppStore.setState((s) => ({
        maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
      }));
    } else {
      useAppStore.setState({ sourceImageData: output, sourceDataUrl: dataUrl });
    }
    useAppStore.getState().saveHistory();
  }, [imageData, preset, selectedMap]);

  return (
    <ToolSection title="Gradient Map" icon={Paintbrush}>
      <div className="flex flex-wrap gap-1">
        {Object.entries(presets).map(([name, colors]) => (
          <button
            key={name}
            onClick={() => setPreset(name)}
            className={cn(
              "text-[10px] px-2 py-1 rounded capitalize flex items-center gap-1",
              preset === name ? "bg-amber-500/30 text-amber-300 ring-1 ring-amber-500/40" : "bg-zinc-800 text-zinc-500"
            )}
          >
            <div className="flex h-2 w-8 rounded-sm overflow-hidden">
              {colors.map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }} />
              ))}
            </div>
            {name}
          </button>
        ))}
      </div>
      <ActionButton label="Apply Gradient Map" onClick={apply} disabled={!imageData} variant="primary" icon={Paintbrush} />
    </ToolSection>
  );
}

// ─── Normal Map Utilities ─────────────────────────────────────────────────────
function NormalMapTools() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);

  const imageData = selectedMap ? maps[selectedMap]?.imageData : null;

  const applyRenormalize = useCallback(() => {
    if (!imageData || !selectedMap) return;
    const output = renormalizeNormalMap(imageData);
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState((s) => ({
      maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
    }));
    useAppStore.getState().saveHistory();
  }, [imageData, selectedMap]);

  const applyFlipY = useCallback(() => {
    if (!imageData || !selectedMap) return;
    const output = flipNormalY(imageData);
    const dataUrl = imageDataToDataUrl(output);
    useAppStore.setState((s) => ({
      maps: { ...s.maps, [selectedMap]: { ...s.maps[selectedMap], imageData: output, dataUrl, generated: true } },
    }));
    useAppStore.getState().saveHistory();
  }, [imageData, selectedMap]);

  return (
    <ToolSection title="Normal Map Utils" icon={ArrowUpDown} badge="PBR">
      <p className="text-[10px] text-zinc-500">Tools specifically for normal maps.</p>
      <div className="grid grid-cols-2 gap-1.5">
        <ActionButton label="Re-normalize" onClick={applyRenormalize} disabled={!imageData || !selectedMap} icon={ArrowUpDown} />
        <ActionButton label="Flip Y (GL↔DX)" onClick={applyFlipY} disabled={!imageData || !selectedMap} icon={FlipVertical} />
      </div>
    </ToolSection>
  );
}

// ─── Main Professional Tools Panel ────────────────────────────────────────────
export default function ProfessionalTools() {
  const sourceImageData = useAppStore((s) => s.sourceImageData);

  if (!sourceImageData) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-zinc-500 text-xs text-center px-4">
        <Cpu className="w-6 h-6 mb-2 text-zinc-600" />
        Import an image to access professional tools
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* ── Tiling & Seamless ── */}
      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider px-1 flex items-center gap-1.5">
        <Grid3X3 className="w-3 h-3" />
        Tiling
      </p>
      <SeamlessTool />

      {/* ── Color & Tone ── */}
      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider px-1 mt-3 flex items-center gap-1.5">
        <Palette className="w-3 h-3" />
        Color & Tone
      </p>
      <AutoCorrectionTools />
      <HSLTool />
      <DesaturateTool />
      <InvertTool />
      <GradientMapTool />

      {/* ── Filters & Effects ── */}
      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider px-1 mt-3 flex items-center gap-1.5">
        <Blend className="w-3 h-3" />
        Filters
      </p>
      <FilterTools />
      <UnsharpMaskTool />
      <EmbossTool />
      <AddNoiseTool />
      <VignetteTool />

      {/* ── Enhancement ── */}
      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider px-1 mt-3 flex items-center gap-1.5">
        <BarChart3 className="w-3 h-3" />
        Enhancement
      </p>
      <ContrastTools />
      <FrequencySepTool />
      <MorphologyTools />
      <PosterizeTool />
      <ChannelMixerTool />

      {/* ── PBR ── */}
      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider px-1 mt-3 flex items-center gap-1.5">
        <ArrowUpDown className="w-3 h-3" />
        PBR Utilities
      </p>
      <NormalMapTools />
      <NoiseGeneratorTool />

      {/* ── Transform ── */}
      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider px-1 mt-3 flex items-center gap-1.5">
        <FlipHorizontal className="w-3 h-3" />
        Transform
      </p>
      <TransformTools />

      {/* ── Analysis ── */}
      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider px-1 mt-3 flex items-center gap-1.5">
        <ScanLine className="w-3 h-3" />
        Analysis
      </p>
      <TextureAnalysis />
      <PaletteExtractor />

      <div className="h-4" />
    </div>
  );
}
