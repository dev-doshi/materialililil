"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { MAP_CONFIGS, MAP_CONTROL_DEFS, MapType } from "@/types/maps";
import { MAP_ICONS } from "@/types/mapIcons";
import { cn } from "@/lib/utils";
import { RotateCcw, RefreshCw, Copy, Share, Trash2, Wand2, HelpCircle, ChevronDown, Zap } from "lucide-react";

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs text-zinc-400 flex items-center gap-1">
          {label}
          {hint && (
            <span className="text-zinc-600 cursor-help" title={hint}>?</span>
          )}
        </label>
        <span className="text-xs text-zinc-500 font-mono">
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
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-zinc-700 accent-amber-500
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-amber-500
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-zinc-900
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:hover:bg-amber-400"
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-zinc-400 flex items-center gap-1">
        {label}
        {hint && (
          <span className="text-zinc-600 cursor-help" title={hint}>?</span>
        )}
      </label>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-9 h-5 rounded-full transition-colors relative",
          value ? "bg-amber-500" : "bg-zinc-700"
        )}
      >
        <div
          className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform"
          style={{ transform: value ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

function CollapsibleGroup({
  label,
  defaultOpen = true,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left group"
      >
        <ChevronDown className={cn("w-3 h-3 text-zinc-600 transition-transform", !open && "-rotate-90")} />
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-400 transition-colors">{label}</p>
      </button>
      {open && <div className="pl-1">{children}</div>}
    </div>
  );
}

export default function MapAdjustments() {
  const selectedMap = useAppStore((s) => s.selectedMap);
  const maps = useAppStore((s) => s.maps);
  const updateMapParams = useAppStore((s) => s.updateMapParams);
  const generateSingleMap = useAppStore((s) => s.generateSingleMap);
  const sourceImageData = useAppStore((s) => s.sourceImageData);
  const copyParamsToAll = useAppStore((s) => s.copyParamsToAll);
  const exportSingleMap = useAppStore((s) => s.exportSingleMap);
  const clearSingleMap = useAppStore((s) => s.clearSingleMap);
  const liveUpdate = useAppStore((s) => s.liveUpdate);
  const toggleLiveUpdate = useAppStore((s) => s.toggleLiveUpdate);

  const [showExplanation, setShowExplanation] = useState(false);

  // Live update: debounced auto-regeneration when sliders change
  const currentMap = selectedMap ? maps[selectedMap] : null;
  const currentParams = currentMap?.params;
  const prevParamsRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Reset params tracking when selected map changes
  useEffect(() => {
    prevParamsRef.current = currentParams ? JSON.stringify(currentParams) : "";
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMap]);

  // Debounced auto-regen when params change in live mode
  useEffect(() => {
    if (!liveUpdate || !selectedMap || !currentMap?.generated) return;

    const key = JSON.stringify(currentParams);
    if (prevParamsRef.current === key) return;
    prevParamsRef.current = key;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      generateSingleMap(selectedMap);
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [currentParams, liveUpdate, currentMap?.generated, selectedMap, generateSingleMap]);

  if (!sourceImageData || !selectedMap) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
          <Wand2 className="w-6 h-6 text-zinc-600" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-zinc-400">
            {!sourceImageData ? "Import an Image" : "Select a Map"}
          </p>
          <p className="text-xs text-zinc-600 max-w-[200px]">
            {!sourceImageData
              ? "Drag & drop or click Import to load your source texture"
              : "Click any map in the left panel to adjust its settings and generate it"}
          </p>
        </div>
        {!sourceImageData && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              <span>Step 1: Import a texture image</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              <span>Step 2: Click &quot;Generate All&quot; to create maps</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              <span>Step 3: Adjust settings and export</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const map = maps[selectedMap];
  const config = MAP_CONFIGS.find((c) => c.type === selectedMap)!;
  const params = map.params;

  // Beginner-friendly explanations for each map type
  const mapExplanations: Record<string, string> = {
    [MapType.Height]: "Shows how high or low each part of the surface is. White = raised, Black = recessed. Used for bump effects and displacement.",
    [MapType.Normal]: "Tells the 3D engine which direction each surface point faces. Creates the illusion of small bumps and dents without adding geometry.",
    [MapType.Diffuse]: "The base color of your material with lighting removed. This is the 'albedo' — what the surface looks like under neutral lighting.",
    [MapType.Metallic]: "Defines which parts are metal (white) and which are non-metal/dielectric (black). Most materials are either fully metallic or not.",
    [MapType.Smoothness]: "The opposite of roughness. White = mirror-smooth and reflective, Black = rough and diffuse. Used by Unity.",
    [MapType.AO]: "Simulates soft shadows in crevices and corners where ambient light is blocked. Adds depth and realism to the material.",
    [MapType.Edge]: "Highlights edges and boundaries in the texture. Useful for detail masks, wear effects, or procedural texturing.",
    [MapType.Roughness]: "Controls how rough or smooth the surface is. White = rough/matte, Black = smooth/shiny. Used by most PBR renderers.",
    [MapType.Displacement]: "Similar to height map but used to actually push geometry up or down. Creates real 3D surface detail.",
    [MapType.Specular]: "Controls the intensity of specular reflections. Brighter = more reflective. Some workflows use this instead of metallic.",
    [MapType.Emissive]: "Defines areas that glow or emit light. White areas will appear to glow in the 3D scene, like LEDs or hot metal.",
    [MapType.Opacity]: "Controls transparency. White = fully visible, Black = fully transparent. Used for materials like leaves, fences, or glass.",
    [MapType.Curvature]: "Shows convex edges (bright) and concave creases (dark). Great for adding edge wear, dirt accumulation, or highlights.",
  };

  const update = (key: string, value: number | boolean) => {
    updateMapParams(selectedMap, { [key]: value });
  };

  const resetParams = () => {
    // Use clearSingleMap which centrally manages per-map defaults
    clearSingleMap(selectedMap);
  };

  const controlGroups = MAP_CONTROL_DEFS[selectedMap];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(() => { const Icon = MAP_ICONS[selectedMap]; return <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: config.color + '20' }}><Icon className="w-4 h-4" style={{ color: config.color }} /></div>; })()}
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">{config.label}</h3>
              <p className="text-xs text-zinc-500">{config.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleLiveUpdate}
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                liveUpdate
                  ? "bg-green-600/20 text-green-400 border border-green-500/30"
                  : "text-zinc-600 hover:text-zinc-400 border border-transparent"
              )}
              title={liveUpdate ? "Live update ON \u2014 maps auto-regenerate when you adjust sliders" : "Live update OFF \u2014 click Generate to apply changes"}
            >
              <Zap className="w-3 h-3" />
              Live
            </button>
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className={cn(
                "p-1 rounded-md transition-colors",
                showExplanation ? "bg-amber-500/20 text-amber-400" : "text-zinc-600 hover:text-zinc-400"
              )}
              title="What is this map?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {showExplanation && (
          <div className="mt-2 p-2.5 rounded-lg bg-amber-950/20 border border-amber-700/30">
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              {mapExplanations[selectedMap] || config.description}
            </p>
          </div>
        )}
      </div>

      {/* Controls — data-driven from MAP_CONTROL_DEFS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {controlGroups.map((group, gi) => (
          <CollapsibleGroup key={gi} label={group.label} defaultOpen={!group.collapsed}>
            <div className="space-y-3">
              {group.controls.map((control) => {
                if (control.type === "slider") {
                  return (
                    <Slider
                      key={control.key}
                      label={control.label}
                      value={(params[control.key] as number) ?? control.defaultValue}
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      onChange={(v) => update(control.key, v)}
                      suffix={control.suffix}
                      hint={control.hint}
                    />
                  );
                }
                return (
                  <Toggle
                    key={control.key}
                    label={control.label}
                    value={(params[control.key] as boolean) ?? control.defaultValue}
                    onChange={(v) => update(control.key, v)}
                    hint={control.hint}
                  />
                );
              })}
            </div>
          </CollapsibleGroup>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-zinc-800 space-y-2">
        <button
          onClick={() => generateSingleMap(selectedMap)}
          disabled={map.generating}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            "bg-amber-500 text-black hover:bg-amber-400",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {map.generating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {map.generating ? "Generating..." : map.generated ? "Regenerate" : "Generate"}
        </button>

        {/* Secondary actions row */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={resetParams}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Reset to Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={() => copyParamsToAll(selectedMap)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Copy common params (intensity, contrast, etc.) to all maps"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy to All
          </button>
        </div>

        {/* Tertiary actions */}
        {map.generated && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => exportSingleMap(selectedMap)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Export this map"
            >
              <Share className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={() => clearSingleMap(selectedMap)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                text-zinc-400 hover:text-red-400 hover:bg-red-600/10 transition-colors"
              title="Clear this map"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
