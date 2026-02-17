export enum MapType {
  Height = "height",
  Normal = "normal",
  Diffuse = "diffuse",
  Metallic = "metallic",
  Smoothness = "smoothness",
  AO = "ao",
  Edge = "edge",
  Roughness = "roughness",
  Displacement = "displacement",
  Specular = "specular",
  Emissive = "emissive",
  Opacity = "opacity",
  Curvature = "curvature",
}

export interface MapConfig {
  type: MapType;
  label: string;
  description: string;
  color: string;
}

export interface MapParams {
  intensity: number;
  contrast: number;
  brightness: number;
  blur: number;
  sharpen: number;
  invert: boolean;
  blackPoint: number;
  whitePoint: number;
  gamma: number;
  // Map-specific
  [key: string]: number | boolean | string;
}

export interface GeneratedMap {
  type: MapType;
  imageData: ImageData | null;
  dataUrl: string | null;
  params: MapParams;
  generating: boolean;
  generated: boolean;
  enabled: boolean;
}

export const MAP_CONFIGS: MapConfig[] = [
  { type: MapType.Height, label: "Height Map", description: "Grayscale depth/elevation data", color: "#9CA3AF" },
  { type: MapType.Normal, label: "Normal Map", description: "Surface orientation for lighting", color: "#818CF8" },
  { type: MapType.Diffuse, label: "Diffuse Map", description: "Base color without lighting", color: "#F59E0B" },
  { type: MapType.Metallic, label: "Metallic Map", description: "Metal vs dielectric regions", color: "#67E8F9" },
  { type: MapType.Smoothness, label: "Smoothness Map", description: "Inverse roughness values", color: "#A78BFA" },
  { type: MapType.AO, label: "AO Map", description: "Ambient occlusion contact shadows", color: "#6B7280" },
  { type: MapType.Edge, label: "Edge Map", description: "Edge detection for details", color: "#34D399" },
  { type: MapType.Roughness, label: "Roughness Map", description: "Micro-surface irregularity", color: "#FB923C" },
  { type: MapType.Displacement, label: "Displacement Map", description: "Geometric surface offset", color: "#F472B6" },
  { type: MapType.Specular, label: "Specular Map", description: "Reflectance at normal incidence", color: "#38BDF8" },
  { type: MapType.Emissive, label: "Emissive Map", description: "Self-illuminated regions", color: "#FACC15" },
  { type: MapType.Opacity, label: "Opacity Map", description: "Transparency/alpha mask", color: "#E879F9" },
  { type: MapType.Curvature, label: "Curvature Map", description: "Convexity and concavity", color: "#FB7185" },
];

/**
 * Map dependency graph: when a map is regenerated, its dependents should auto-regenerate.
 * Key = source map that was changed, Value = maps that depend on it.
 */
export const MAP_DEPENDENCIES: Partial<Record<MapType, MapType[]>> = {
  [MapType.Height]: [MapType.Normal, MapType.Displacement, MapType.Curvature, MapType.AO],
  [MapType.Roughness]: [MapType.Smoothness],
  [MapType.Smoothness]: [MapType.Roughness],
};

/** Get all maps that depend on a given map type (non-recursive, direct dependents only) */
export function getDependentMaps(type: MapType): MapType[] {
  return MAP_DEPENDENCIES[type] ?? [];
}

/** PBR Validation rules */
export interface PBRValidation {
  type: "warning" | "error";
  map: MapType;
  message: string;
}

export function validatePBR(maps: Record<MapType, { imageData: ImageData | null; generated: boolean }>): PBRValidation[] {
  const issues: PBRValidation[] = [];

  // Check diffuse: values should be 30-240 for PBR
  const diffuse = maps[MapType.Diffuse];
  if (diffuse.generated && diffuse.imageData) {
    const data = diffuse.imageData.data;
    let tooHighCount = 0;
    let tooLowCount = 0;
    const total = diffuse.imageData.width * diffuse.imageData.height;
    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      if (lum > 243) tooHighCount++;
      if (lum < 10) tooLowCount++;
    }
    if (tooHighCount / total > 0.05) {
      issues.push({ type: "warning", map: MapType.Diffuse, message: `${Math.round(tooHighCount / total * 100)}% of pixels are too bright (>243). PBR albedo should be 30-240.` });
    }
    if (tooLowCount / total > 0.05) {
      issues.push({ type: "warning", map: MapType.Diffuse, message: `${Math.round(tooLowCount / total * 100)}% of pixels are too dark (<10). Pure black is unrealistic for most materials.` });
    }
  }

  // Check metallic: should be mostly binary (0 or 1)
  const metallic = maps[MapType.Metallic];
  if (metallic.generated && metallic.imageData) {
    const data = metallic.imageData.data;
    let midRangeCount = 0;
    const total = metallic.imageData.width * metallic.imageData.height;
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i];
      if (v > 25 && v < 230) midRangeCount++;
    }
    if (midRangeCount / total > 0.15) {
      issues.push({ type: "warning", map: MapType.Metallic, message: `${Math.round(midRangeCount / total * 100)}% of metallic pixels are mid-range. Metallic should be mostly 0 (dielectric) or 255 (metal).` });
    }
  }

  // Check roughness: should have reasonable range
  const roughness = maps[MapType.Roughness];
  if (roughness.generated && roughness.imageData) {
    const data = roughness.imageData.data;
    let mirrorCount = 0;
    const total = roughness.imageData.width * roughness.imageData.height;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 5) mirrorCount++;
    }
    if (mirrorCount / total > 0.10) {
      issues.push({ type: "warning", map: MapType.Roughness, message: `${Math.round(mirrorCount / total * 100)}% of pixels are near-zero roughness (mirror smooth). This causes visible specular artifacts.` });
    }
  }

  // Check normal map: blue channel should average near 255
  const normal = maps[MapType.Normal];
  if (normal.generated && normal.imageData) {
    const data = normal.imageData.data;
    let blueSum = 0;
    const total = normal.imageData.width * normal.imageData.height;
    for (let i = 0; i < data.length; i += 4) {
      blueSum += data[i + 2];
    }
    const avgBlue = blueSum / total;
    if (avgBlue < 180) {
      issues.push({ type: "warning", map: MapType.Normal, message: `Normal map blue channel average is ${Math.round(avgBlue)} (expected ~230+). Normal strength may be too high.` });
    }
  }

  return issues;
}

export const DEFAULT_PARAMS: MapParams = {
  intensity: 100,
  contrast: 100,
  brightness: 0,
  blur: 0,
  sharpen: 0,
  invert: false,
  blackPoint: 0,
  whitePoint: 255,
  gamma: 1.0,
  roughnessFloor: 20,
};

// ─── Per-Map Parameter Control Definitions ────────────────────────────────────
// Single source of truth for: which controls to render, labels, ranges, defaults, hints.

export type ParamControlDef =
  | {
      type: "slider";
      key: string;
      label: string;
      min: number;
      max: number;
      step: number;
      defaultValue: number;
      suffix?: string;
      hint?: string;
    }
  | {
      type: "toggle";
      key: string;
      label: string;
      defaultValue: boolean;
      hint?: string;
    };

export interface ParamGroupDef {
  label: string;
  controls: ParamControlDef[];
  collapsed?: boolean;
}

export const MAP_CONTROL_DEFS: Record<MapType, ParamGroupDef[]> = {
  // ── Height Map ─────────────────────────────────────────────────────────────
  [MapType.Height]: [
    {
      label: "Height Generation",
      controls: [
        { type: "slider", key: "heightPreBlur", label: "Smoothing", min: 0, max: 5, step: 0.1, defaultValue: 1.0, suffix: "σ", hint: "Smooth out source noise before extracting height. Higher = softer terrain" },
        { type: "slider", key: "intensity", label: "Intensity", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Overall height range — 100% = normal" },
        { type: "slider", key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Increase separation between highs and lows" },
        { type: "slider", key: "brightness", label: "Height Offset", min: -100, max: 100, step: 1, defaultValue: 0, hint: "Shift the overall height level up or down" },
      ],
    },
    {
      label: "Detail",
      controls: [
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 10, suffix: "%", hint: "Enhance fine surface detail in the height" },
        { type: "slider", key: "blur", label: "Post Blur", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Additional smoothing after height extraction" },
        { type: "toggle", key: "invert", label: "Invert", defaultValue: false, hint: "Flip heights — raised becomes recessed and vice versa" },
      ],
    },
    {
      label: "Levels",
      collapsed: true,
      controls: [
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0, hint: "Pixels darker than this become fully black" },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255, hint: "Pixels brighter than this become fully white" },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0, hint: "Adjust midtone distribution. <1 = brighter mids, >1 = darker mids" },
      ],
    },
  ],

  // ── Normal Map ─────────────────────────────────────────────────────────────
  [MapType.Normal]: [
    {
      label: "Normal Strength",
      controls: [
        { type: "slider", key: "normalStrength", label: "Strength", min: 0.1, max: 20, step: 0.1, defaultValue: 1.5, hint: "How pronounced surface bumps appear. 1-3 for subtle, 5-15 for strong" },
      ],
    },
    {
      label: "Height Input",
      controls: [
        { type: "slider", key: "normalPreBlur", label: "Height Smoothing", min: 0, max: 5, step: 0.1, defaultValue: 1.0, suffix: "σ", hint: "Smooth the height data before computing normals. Removes small bumps" },
        { type: "slider", key: "sharpen", label: "Height Detail", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%", hint: "Enhance fine height detail before computing normals" },
        { type: "slider", key: "contrast", label: "Height Contrast", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Contrast of the height data used to compute normals" },
      ],
    },
    {
      label: "Options",
      collapsed: true,
      controls: [
        { type: "toggle", key: "invert", label: "Invert Height", defaultValue: false, hint: "Invert the height data — flips concave/convex in normals" },
        { type: "slider", key: "intensity", label: "Height Intensity", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Scale height amplitude before normal computation" },
      ],
    },
  ],

  // ── Diffuse Map ────────────────────────────────────────────────────────────
  [MapType.Diffuse]: [
    {
      label: "De-Lighting",
      controls: [
        { type: "slider", key: "deLightStrength", label: "De-Light Strength", min: 0, max: 100, step: 1, defaultValue: 40, suffix: "%", hint: "Remove baked-in lighting/shadows from the source. Higher = more shadow removal" },
      ],
    },
    {
      label: "Color",
      controls: [
        { type: "slider", key: "intensity", label: "Vibrance", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Overall color intensity. 100% = unchanged" },
        { type: "slider", key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Color contrast — separates lights from darks" },
        { type: "slider", key: "brightness", label: "Brightness", min: -100, max: 100, step: 1, defaultValue: 0, hint: "Make the diffuse lighter or darker overall" },
      ],
    },
    {
      label: "Detail",
      controls: [
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%", hint: "Enhance texture detail in the color" },
        { type: "slider", key: "blur", label: "Soften", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Soften the diffuse color for a smoother look" },
      ],
    },
    {
      label: "Levels",
      collapsed: true,
      controls: [
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0, hint: "Darks clipping level" },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255, hint: "Highlights clipping level" },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0, hint: "Midtone brightness" },
        { type: "toggle", key: "invert", label: "Invert Colors", defaultValue: false, hint: "Invert all color channels" },
      ],
    },
  ],

  // ── Metallic Map ───────────────────────────────────────────────────────────
  [MapType.Metallic]: [
    {
      label: "Metallic Detection",
      controls: [
        { type: "slider", key: "metallicThreshold", label: "Threshold", min: 0, max: 100, step: 1, defaultValue: 60, suffix: "%", hint: "Brightness cutoff for metallic areas. Higher = fewer areas marked as metal" },
        { type: "slider", key: "contrast", label: "Edge Hardness", min: 0, max: 200, step: 1, defaultValue: 115, suffix: "%", hint: "How sharp the metal/non-metal boundary is. Higher = harder cutoff" },
      ],
    },
    {
      label: "Refinement",
      controls: [
        { type: "slider", key: "intensity", label: "Intensity", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Overall metallic map strength" },
        { type: "slider", key: "brightness", label: "Bias", min: -100, max: 100, step: 1, defaultValue: 0, hint: "Push overall metallic values brighter or darker" },
        { type: "slider", key: "blur", label: "Smooth", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Smooth out noisy metallic detection" },
      ],
    },
    {
      label: "Advanced",
      collapsed: true,
      controls: [
        { type: "toggle", key: "invert", label: "Invert", defaultValue: false, hint: "Swap metallic and non-metallic regions" },
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%" },
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0 },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255 },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
      ],
    },
  ],

  // ── Smoothness Map ─────────────────────────────────────────────────────────
  [MapType.Smoothness]: [
    {
      label: "Smoothness",
      controls: [
        { type: "slider", key: "textureScale", label: "Texture Scale", min: 3, max: 15, step: 2, defaultValue: 7, suffix: "px", hint: "Window size for analyzing surface texture. Larger = captures broader patterns" },
        { type: "slider", key: "intensity", label: "Intensity", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Overall smoothness strength" },
        { type: "slider", key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, defaultValue: 110, suffix: "%", hint: "Separation between smooth and rough areas" },
      ],
    },
    {
      label: "Refinement",
      controls: [
        { type: "slider", key: "brightness", label: "Bias", min: -100, max: 100, step: 1, defaultValue: 0, hint: "Shift overall smoothness level" },
        { type: "slider", key: "blur", label: "Smooth", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Reduce noise in the smoothness map" },
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%", hint: "Enhance fine detail in smoothness" },
      ],
    },
    {
      label: "Options",
      collapsed: true,
      controls: [
        { type: "toggle", key: "invert", label: "Invert (→ Roughness)", defaultValue: false, hint: "Convert to roughness — flip smooth and rough" },
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0 },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255 },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
      ],
    },
  ],

  // ── AO Map ─────────────────────────────────────────────────────────────────
  [MapType.AO]: [
    {
      label: "Ambient Occlusion",
      controls: [
        { type: "slider", key: "aoRadius", label: "Radius", min: 1, max: 64, step: 1, defaultValue: 12, suffix: "px", hint: "Size of shadow sampling area. Larger = broader, softer shadows" },
        { type: "slider", key: "aoIntensity", label: "Shadow Depth", min: 0, max: 300, step: 1, defaultValue: 160, suffix: "%", hint: "Darkness of occlusion shadows. Higher = darker crevices" },
      ],
    },
    {
      label: "Refinement",
      controls: [
        { type: "slider", key: "intensity", label: "Intensity", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Overall AO map strength" },
        { type: "slider", key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Sharpen the transition between shadowed and unshadowed" },
        { type: "slider", key: "brightness", label: "Brightness", min: -100, max: 100, step: 1, defaultValue: 0, hint: "Lighten or deepen the overall AO" },
        { type: "slider", key: "blur", label: "Smooth", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Soften the AO for a smoother result" },
      ],
    },
    {
      label: "Advanced",
      collapsed: true,
      controls: [
        { type: "toggle", key: "invert", label: "Invert", defaultValue: false, hint: "Show occlusion as bright instead of dark" },
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%" },
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0 },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255 },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
      ],
    },
  ],

  // ── Edge Map ───────────────────────────────────────────────────────────────
  [MapType.Edge]: [
    {
      label: "Edge Detection",
      controls: [
        { type: "slider", key: "edgeLowThreshold", label: "Sensitivity", min: 0, max: 255, step: 1, defaultValue: 30, hint: "Minimum edge strength to detect. Lower = more edges (more sensitive)" },
        { type: "slider", key: "edgeHighThreshold", label: "Confirmation", min: 0, max: 255, step: 1, defaultValue: 120, hint: "Strong edge threshold. Lower = more edges confirmed" },
      ],
    },
    {
      label: "Output",
      controls: [
        { type: "slider", key: "intensity", label: "Intensity", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Brightness of detected edges" },
        { type: "slider", key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Sharpness of edge/non-edge separation" },
        { type: "slider", key: "blur", label: "Edge Softness", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Soften/feather the edge lines" },
      ],
    },
    {
      label: "Options",
      collapsed: true,
      controls: [
        { type: "toggle", key: "invert", label: "Invert", defaultValue: false, hint: "Show non-edge areas as bright instead" },
        { type: "slider", key: "brightness", label: "Brightness", min: -100, max: 100, step: 1, defaultValue: 0 },
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%" },
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0 },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255 },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
      ],
    },
  ],

  // ── Roughness Map ──────────────────────────────────────────────────────────
  [MapType.Roughness]: [
    {
      label: "Roughness",
      controls: [
        { type: "slider", key: "textureScale", label: "Texture Scale", min: 3, max: 15, step: 2, defaultValue: 7, suffix: "px", hint: "Window size for surface analysis. Larger = captures broader roughness patterns" },
        { type: "slider", key: "roughnessFloor", label: "Min Roughness", min: 0, max: 100, step: 1, defaultValue: 20, suffix: "%", hint: "Minimum roughness level — prevents areas from becoming mirror-smooth" },
        { type: "slider", key: "intensity", label: "Intensity", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Overall roughness strength" },
        { type: "slider", key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, defaultValue: 110, suffix: "%", hint: "Separation between rough and smooth areas" },
      ],
    },
    {
      label: "Refinement",
      controls: [
        { type: "slider", key: "brightness", label: "Bias", min: -100, max: 100, step: 1, defaultValue: 0, hint: "Shift overall roughness level" },
        { type: "slider", key: "blur", label: "Smooth", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Reduce noise in roughness" },
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%", hint: "Enhance roughness detail" },
      ],
    },
    {
      label: "Options",
      collapsed: true,
      controls: [
        { type: "toggle", key: "invert", label: "Invert (→ Smoothness)", defaultValue: false, hint: "Convert to smoothness — flip rough and smooth" },
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0 },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255 },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
      ],
    },
  ],

  // ── Displacement Map ───────────────────────────────────────────────────────
  [MapType.Displacement]: [
    {
      label: "Displacement",
      controls: [
        { type: "slider", key: "displacementDetail", label: "Detail Blend", min: 0, max: 100, step: 1, defaultValue: 50, suffix: "%", hint: "Balance micro detail (0%) vs broad shapes (100%)" },
        { type: "slider", key: "intensity", label: "Intensity", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Overall displacement strength" },
        { type: "slider", key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Sharpness of displacement transitions" },
      ],
    },
    {
      label: "Refinement",
      controls: [
        { type: "slider", key: "brightness", label: "Height Offset", min: -100, max: 100, step: 1, defaultValue: 0, hint: "Shift the base displacement level" },
        { type: "slider", key: "blur", label: "Smoothing", min: 0, max: 15, step: 0.5, defaultValue: 0.5, suffix: "σ", hint: "Smooth out high-frequency displacement noise" },
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%", hint: "Enhance displacement detail" },
      ],
    },
    {
      label: "Options",
      collapsed: true,
      controls: [
        { type: "toggle", key: "invert", label: "Invert", defaultValue: false, hint: "Flip displacement direction" },
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0 },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255 },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
      ],
    },
  ],

  // ── Specular Map ───────────────────────────────────────────────────────────
  [MapType.Specular]: [
    {
      label: "Specular Reflectance",
      controls: [
        { type: "slider", key: "intensity", label: "Reflectance", min: 0, max: 200, step: 1, defaultValue: 90, suffix: "%", hint: "Overall specular reflection intensity" },
        { type: "slider", key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, defaultValue: 105, suffix: "%", hint: "Separation between reflective and matte areas" },
        { type: "slider", key: "brightness", label: "Brightness", min: -100, max: 100, step: 1, defaultValue: 0, hint: "Shift the base reflectance level" },
      ],
    },
    {
      label: "Detail",
      controls: [
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%", hint: "Enhance specular detail" },
        { type: "slider", key: "blur", label: "Smooth", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Smooth out specular noise" },
      ],
    },
    {
      label: "Options",
      collapsed: true,
      controls: [
        { type: "toggle", key: "invert", label: "Invert", defaultValue: false, hint: "Invert specular values" },
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0 },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255 },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
      ],
    },
  ],

  // ── Emissive Map ───────────────────────────────────────────────────────────
  [MapType.Emissive]: [
    {
      label: "Emission Detection",
      controls: [
        { type: "slider", key: "emissiveThreshold", label: "Brightness Threshold", min: 0, max: 100, step: 1, defaultValue: 90, suffix: "%", hint: "Only areas brighter than this glow. Higher = only the brightest spots emit" },
        { type: "slider", key: "emissiveSatMin", label: "Min Saturation", min: 0, max: 100, step: 1, defaultValue: 10, suffix: "%", hint: "Minimum color saturation for emission. Blocks white/gray areas from glowing" },
      ],
    },
    {
      label: "Glow",
      controls: [
        { type: "slider", key: "intensity", label: "Glow Intensity", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Overall emission brightness" },
        { type: "slider", key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Sharpness of the emission falloff" },
        { type: "slider", key: "blur", label: "Bloom", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Soft glow/bloom effect around emissive areas" },
      ],
    },
    {
      label: "Advanced",
      collapsed: true,
      controls: [
        { type: "slider", key: "brightness", label: "Brightness", min: -100, max: 100, step: 1, defaultValue: 0 },
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%" },
        { type: "toggle", key: "invert", label: "Invert", defaultValue: false, hint: "Emit from dark areas instead of bright" },
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0 },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255 },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
      ],
    },
  ],

  // ── Opacity Map ────────────────────────────────────────────────────────────
  [MapType.Opacity]: [
    {
      label: "Opacity Mask",
      controls: [
        { type: "slider", key: "opacityThreshold", label: "Cutoff Threshold", min: 0, max: 128, step: 1, defaultValue: 2, hint: "Brightness below this becomes fully transparent. Set 0 for smooth gradients" },
        { type: "slider", key: "intensity", label: "Intensity", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Overall opacity map strength" },
        { type: "slider", key: "contrast", label: "Edge Hardness", min: 0, max: 200, step: 1, defaultValue: 120, suffix: "%", hint: "How sharp the opaque/transparent boundary is" },
      ],
    },
    {
      label: "Refinement",
      controls: [
        { type: "slider", key: "brightness", label: "Bias", min: -100, max: 100, step: 1, defaultValue: 0, hint: "Shift the opacity cutoff level" },
        { type: "slider", key: "blur", label: "Edge Softness", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Soften the transparency edges" },
      ],
    },
    {
      label: "Options",
      collapsed: true,
      controls: [
        { type: "toggle", key: "invert", label: "Invert", defaultValue: false, hint: "Swap opaque and transparent regions" },
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%" },
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0 },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255 },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
      ],
    },
  ],

  // ── Curvature Map ──────────────────────────────────────────────────────────
  [MapType.Curvature]: [
    {
      label: "Curvature",
      controls: [
        { type: "slider", key: "curvaturePreBlur", label: "Input Smoothing", min: 0, max: 5, step: 0.1, defaultValue: 1.5, suffix: "σ", hint: "Smooth source before curvature analysis. Higher = broader curvature features" },
        { type: "slider", key: "curvatureMultiplier", label: "Amplification", min: 0.5, max: 10, step: 0.5, defaultValue: 2.0, suffix: "×", hint: "How much to amplify curvature values. Higher = more dramatic" },
        { type: "slider", key: "intensity", label: "Intensity", min: 0, max: 200, step: 1, defaultValue: 120, suffix: "%", hint: "Overall curvature map strength" },
      ],
    },
    {
      label: "Refinement",
      controls: [
        { type: "slider", key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, defaultValue: 100, suffix: "%", hint: "Contrast between convex and concave" },
        { type: "slider", key: "brightness", label: "Midpoint Shift", min: -100, max: 100, step: 1, defaultValue: 0, hint: "Shift the neutral gray midpoint" },
        { type: "slider", key: "blur", label: "Smooth", min: 0, max: 15, step: 0.5, defaultValue: 0, suffix: "σ", hint: "Smooth the curvature output" },
        { type: "slider", key: "sharpen", label: "Sharpen", min: 0, max: 50, step: 1, defaultValue: 0, suffix: "%", hint: "Enhance curvature detail" },
      ],
    },
    {
      label: "Options",
      collapsed: true,
      controls: [
        { type: "toggle", key: "invert", label: "Invert", defaultValue: false, hint: "Swap convex and concave visualization" },
        { type: "slider", key: "blackPoint", label: "Black Point", min: 0, max: 255, step: 1, defaultValue: 0 },
        { type: "slider", key: "whitePoint", label: "White Point", min: 0, max: 255, step: 1, defaultValue: 255 },
        { type: "slider", key: "gamma", label: "Gamma", min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
      ],
    },
  ],
};

/** Extract default parameter values from the control definitions for a given map type */
export function getMapDefaults(type: MapType): MapParams {
  const groups = MAP_CONTROL_DEFS[type];
  // Start with base defaults for params that may not appear in the UI
  const params: MapParams = { ...DEFAULT_PARAMS };
  for (const group of groups) {
    for (const control of group.controls) {
      (params as Record<string, unknown>)[control.key] = control.defaultValue;
    }
  }
  return params;
}

// ─── Texture Material Presets ──────────────────────────────────────────────────
// Built-in presets that configure all map params for specific material types.

export interface TexturePreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "hard" | "reflective" | "organic" | "soft";
  params: Partial<Record<MapType, Partial<MapParams>>>;
}

export const TEXTURE_PRESETS: TexturePreset[] = [
  // ── Hard Surfaces ──
  {
    id: "stone",
    name: "Stone",
    description: "Rough natural rock",
    emoji: "🪨",
    category: "hard",
    params: {
      [MapType.Height]: { intensity: 120, heightPreBlur: 0.8, contrast: 115, sharpen: 12 },
      [MapType.Normal]: { normalStrength: 3.0, normalPreBlur: 0.6 },
      [MapType.Diffuse]: { deLightStrength: 50, contrast: 105 },
      [MapType.Metallic]: { metallicThreshold: 98, intensity: 15 },
      [MapType.Roughness]: { textureScale: 9, roughnessFloor: 55, intensity: 95, contrast: 100, brightness: 5 },
      [MapType.AO]: { aoRadius: 16, aoIntensity: 180 },
      [MapType.Displacement]: { displacementDetail: 40, intensity: 120 },
      [MapType.Curvature]: { curvatureMultiplier: 2.5, intensity: 120 },
    },
  },
  {
    id: "concrete",
    name: "Concrete",
    description: "Uniform rough surface",
    emoji: "🏗️",
    category: "hard",
    params: {
      [MapType.Height]: { intensity: 75, heightPreBlur: 1.5, contrast: 95 },
      [MapType.Normal]: { normalStrength: 1.8, normalPreBlur: 1.0 },
      [MapType.Diffuse]: { deLightStrength: 40, contrast: 100 },
      [MapType.Metallic]: { metallicThreshold: 99, intensity: 10 },
      [MapType.Roughness]: { textureScale: 9, roughnessFloor: 60, intensity: 95, contrast: 100, brightness: 5 },
      [MapType.AO]: { aoRadius: 12, aoIntensity: 130 },
    },
  },
  {
    id: "brick",
    name: "Brick",
    description: "Regular pattern with grout",
    emoji: "🧱",
    category: "hard",
    params: {
      [MapType.Height]: { intensity: 130, heightPreBlur: 0.3, contrast: 130, sharpen: 15 },
      [MapType.Normal]: { normalStrength: 3.5, normalPreBlur: 0.4 },
      [MapType.Diffuse]: { deLightStrength: 55, contrast: 110 },
      [MapType.Metallic]: { metallicThreshold: 99, intensity: 10 },
      [MapType.Roughness]: { textureScale: 9, roughnessFloor: 50, intensity: 95, contrast: 105, brightness: 5 },
      [MapType.AO]: { aoRadius: 18, aoIntensity: 200 },
      [MapType.Displacement]: { displacementDetail: 30, intensity: 140 },
    },
  },
  // ── Reflective ──
  {
    id: "metal",
    name: "Metal",
    description: "Metallic reflective surface",
    emoji: "⚙️",
    category: "reflective",
    params: {
      [MapType.Height]: { intensity: 45, heightPreBlur: 2.0, contrast: 80 },
      [MapType.Normal]: { normalStrength: 0.8, normalPreBlur: 1.5 },
      [MapType.Diffuse]: { deLightStrength: 15, contrast: 95 },
      [MapType.Metallic]: { metallicThreshold: 30, contrast: 120, intensity: 140 },
      [MapType.Roughness]: { textureScale: 5, roughnessFloor: 5, intensity: 60, contrast: 90, brightness: -10 },
      [MapType.AO]: { aoRadius: 6, aoIntensity: 80 },
      [MapType.Specular]: { intensity: 140, contrast: 110 },
    },
  },
  {
    id: "glass",
    name: "Glass",
    description: "Smooth transparent surface",
    emoji: "🔮",
    category: "reflective",
    params: {
      [MapType.Height]: { intensity: 10, heightPreBlur: 3.0, contrast: 50 },
      [MapType.Normal]: { normalStrength: 0.3, normalPreBlur: 2.5 },
      [MapType.Diffuse]: { deLightStrength: 10, contrast: 80, brightness: 10 },
      [MapType.Metallic]: { metallicThreshold: 80, intensity: 50 },
      [MapType.Roughness]: { textureScale: 3, roughnessFloor: 0, intensity: 20, contrast: 80, brightness: -20 },
      [MapType.Specular]: { intensity: 160, contrast: 120 },
      [MapType.Opacity]: { opacityThreshold: 0, intensity: 60 },
    },
  },
  {
    id: "marble",
    name: "Marble",
    description: "Polished stone with veins",
    emoji: "🏛️",
    category: "reflective",
    params: {
      [MapType.Height]: { intensity: 50, heightPreBlur: 2.0, contrast: 85 },
      [MapType.Normal]: { normalStrength: 0.8, normalPreBlur: 1.5 },
      [MapType.Diffuse]: { deLightStrength: 25, intensity: 105, contrast: 105 },
      [MapType.Metallic]: { metallicThreshold: 98, intensity: 15 },
      [MapType.Roughness]: { textureScale: 5, roughnessFloor: 8, intensity: 40, contrast: 90, brightness: -10 },
      [MapType.Specular]: { intensity: 130, contrast: 108 },
      [MapType.AO]: { aoRadius: 8, aoIntensity: 100 },
    },
  },
  // ── Organic ──
  {
    id: "wood",
    name: "Wood",
    description: "Natural grain pattern",
    emoji: "🪵",
    category: "organic",
    params: {
      [MapType.Height]: { intensity: 85, heightPreBlur: 1.0, contrast: 105 },
      [MapType.Normal]: { normalStrength: 1.5, normalPreBlur: 0.8 },
      [MapType.Diffuse]: { deLightStrength: 35, intensity: 105 },
      [MapType.Metallic]: { metallicThreshold: 99, intensity: 10 },
      [MapType.Roughness]: { textureScale: 7, roughnessFloor: 40, intensity: 90, contrast: 100, brightness: 0 },
      [MapType.AO]: { aoRadius: 10, aoIntensity: 130 },
      [MapType.Displacement]: { displacementDetail: 55, intensity: 75 },
    },
  },
  {
    id: "leather",
    name: "Leather",
    description: "Textured organic hide",
    emoji: "👜",
    category: "organic",
    params: {
      [MapType.Height]: { intensity: 80, heightPreBlur: 0.8, contrast: 105, sharpen: 8 },
      [MapType.Normal]: { normalStrength: 1.8, normalPreBlur: 0.8 },
      [MapType.Diffuse]: { deLightStrength: 35 },
      [MapType.Metallic]: { metallicThreshold: 99, intensity: 10 },
      [MapType.Roughness]: { textureScale: 7, roughnessFloor: 40, intensity: 90, contrast: 100, brightness: 0 },
      [MapType.AO]: { aoRadius: 8, aoIntensity: 120 },
    },
  },
  {
    id: "foliage",
    name: "Foliage",
    description: "Leaves and vegetation",
    emoji: "🌿",
    category: "organic",
    params: {
      [MapType.Height]: { intensity: 95, heightPreBlur: 0.8, contrast: 105 },
      [MapType.Normal]: { normalStrength: 2.0, normalPreBlur: 0.8 },
      [MapType.Diffuse]: { deLightStrength: 45, intensity: 110 },
      [MapType.Metallic]: { metallicThreshold: 99, intensity: 5 },
      [MapType.Roughness]: { textureScale: 7, roughnessFloor: 35, intensity: 85, contrast: 100, brightness: 0 },
      [MapType.AO]: { aoRadius: 10, aoIntensity: 150 },
      [MapType.Opacity]: { opacityThreshold: 10, intensity: 110, contrast: 130 },
      [MapType.Emissive]: { emissiveThreshold: 96 },
    },
  },
  // ── Soft / Synthetic ──
  {
    id: "fabric",
    name: "Fabric",
    description: "Woven cloth or textile",
    emoji: "🧵",
    category: "soft",
    params: {
      [MapType.Height]: { intensity: 55, heightPreBlur: 1.5, contrast: 85 },
      [MapType.Normal]: { normalStrength: 1.0, normalPreBlur: 1.5 },
      [MapType.Diffuse]: { deLightStrength: 30, intensity: 105 },
      [MapType.Metallic]: { metallicThreshold: 99, intensity: 5 },
      [MapType.Roughness]: { textureScale: 5, roughnessFloor: 50, intensity: 100, contrast: 95, brightness: 5 },
      [MapType.AO]: { aoRadius: 6, aoIntensity: 100 },
      [MapType.Displacement]: { displacementDetail: 30, intensity: 45 },
    },
  },
  {
    id: "plastic",
    name: "Plastic",
    description: "Smooth synthetic material",
    emoji: "🧴",
    category: "soft",
    params: {
      [MapType.Height]: { intensity: 30, heightPreBlur: 2.0, contrast: 80 },
      [MapType.Normal]: { normalStrength: 0.6, normalPreBlur: 1.5 },
      [MapType.Diffuse]: { deLightStrength: 20 },
      [MapType.Metallic]: { metallicThreshold: 98, intensity: 10 },
      [MapType.Roughness]: { textureScale: 5, roughnessFloor: 10, intensity: 55, contrast: 85, brightness: -5 },
      [MapType.AO]: { aoRadius: 6, aoIntensity: 80 },
      [MapType.Specular]: { intensity: 115, contrast: 105 },
    },
  },
  {
    id: "skin",
    name: "Skin",
    description: "Human or animal skin",
    emoji: "🤲",
    category: "soft",
    params: {
      [MapType.Height]: { intensity: 50, heightPreBlur: 1.5, contrast: 85 },
      [MapType.Normal]: { normalStrength: 1.0, normalPreBlur: 1.2 },
      [MapType.Diffuse]: { deLightStrength: 50, intensity: 100 },
      [MapType.Metallic]: { metallicThreshold: 99, intensity: 5 },
      [MapType.Roughness]: { textureScale: 5, roughnessFloor: 35, intensity: 75, contrast: 95, brightness: 0 },
      [MapType.AO]: { aoRadius: 6, aoIntensity: 90 },
      [MapType.Specular]: { intensity: 95, contrast: 95 },
    },
  },
];

export interface ExportPreset {
  name: string;
  software: string;
  maps: { type: MapType; suffix: string; packInto?: string }[];
  format: string;
  normalConvention: "opengl" | "directx";
  notes: string;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    name: "Blender (Principled BSDF)",
    software: "blender",
    maps: [
      { type: MapType.Diffuse, suffix: "_base_color" },
      { type: MapType.Normal, suffix: "_normal" },
      { type: MapType.Roughness, suffix: "_roughness" },
      { type: MapType.Metallic, suffix: "_metallic" },
      { type: MapType.AO, suffix: "_ao" },
      { type: MapType.Displacement, suffix: "_displacement" },
      { type: MapType.Emissive, suffix: "_emission" },
    ],
    format: "png",
    normalConvention: "opengl",
    notes: "Separate maps, no packing. 16-bit PNG recommended.",
  },
  {
    name: "Unity URP/HDRP",
    software: "unity",
    maps: [
      { type: MapType.Diffuse, suffix: "_Albedo" },
      { type: MapType.Normal, suffix: "_Normal" },
      { type: MapType.Metallic, suffix: "_MetallicSmoothness" },
      { type: MapType.AO, suffix: "_AO" },
      { type: MapType.Emissive, suffix: "_Emission" },
      { type: MapType.Height, suffix: "_Height" },
    ],
    format: "png",
    normalConvention: "opengl",
    notes: "Metallic (R) + Smoothness (A) packed into single RGBA.",
  },
  {
    name: "Unreal Engine",
    software: "unreal",
    maps: [
      { type: MapType.Diffuse, suffix: "_D" },
      { type: MapType.Normal, suffix: "_N" },
      { type: MapType.AO, suffix: "_ORM" },
      { type: MapType.Emissive, suffix: "_E" },
      { type: MapType.Displacement, suffix: "_DP" },
    ],
    format: "png",
    normalConvention: "directx",
    notes: "Normal Y-channel flipped for DirectX. ORM = AO(R) + Roughness(G) + Metallic(B).",
  },
  {
    name: "Godot 4",
    software: "godot",
    maps: [
      { type: MapType.Diffuse, suffix: "_albedo" },
      { type: MapType.Normal, suffix: "_normal" },
      { type: MapType.AO, suffix: "_orm" },
      { type: MapType.Emissive, suffix: "_emission" },
      { type: MapType.Height, suffix: "_depth" },
    ],
    format: "png",
    normalConvention: "opengl",
    notes: "ORM packing: AO(R) + Roughness(G) + Metallic(B).",
  },
  {
    name: "glTF / PBR Standard",
    software: "gltf",
    maps: [
      { type: MapType.Diffuse, suffix: "_baseColor" },
      { type: MapType.Normal, suffix: "_normal" },
      { type: MapType.Metallic, suffix: "_metallicRoughness" },
      { type: MapType.AO, suffix: "_occlusion" },
      { type: MapType.Emissive, suffix: "_emissive" },
    ],
    format: "png",
    normalConvention: "opengl",
    notes: "Per glTF 2.0 spec. MetallicRoughness packed: G=Roughness, B=Metallic.",
  },
  {
    name: "Maya / Arnold",
    software: "maya",
    maps: [
      { type: MapType.Diffuse, suffix: "_basecolor" },
      { type: MapType.Normal, suffix: "_normal" },
      { type: MapType.Roughness, suffix: "_roughness" },
      { type: MapType.Metallic, suffix: "_metallic" },
      { type: MapType.AO, suffix: "_ao" },
      { type: MapType.Displacement, suffix: "_displacement" },
      { type: MapType.Specular, suffix: "_specular" },
    ],
    format: "png",
    normalConvention: "opengl",
    notes: "Full separate map set for Arnold renderer.",
  },
  {
    name: "3ds Max / V-Ray",
    software: "3dsmax",
    maps: [
      { type: MapType.Diffuse, suffix: "_diffuse" },
      { type: MapType.Normal, suffix: "_normal" },
      { type: MapType.Roughness, suffix: "_roughness" },
      { type: MapType.Metallic, suffix: "_metallic" },
      { type: MapType.AO, suffix: "_ao" },
      { type: MapType.Displacement, suffix: "_displacement" },
    ],
    format: "png",
    normalConvention: "directx",
    notes: "DirectX normal convention for V-Ray.",
  },
  {
    name: "Substance Painter",
    software: "substance",
    maps: [
      { type: MapType.Diffuse, suffix: "_BaseColor" },
      { type: MapType.Normal, suffix: "_Normal" },
      { type: MapType.Roughness, suffix: "_Roughness" },
      { type: MapType.Metallic, suffix: "_Metallic" },
      { type: MapType.AO, suffix: "_AmbientOcclusion" },
      { type: MapType.Height, suffix: "_Height" },
    ],
    format: "png",
    normalConvention: "opengl",
    notes: "Substance Painter standard naming convention.",
  },
  {
    name: "Custom (All Maps)",
    software: "custom",
    maps: [
      { type: MapType.Height, suffix: "_height" },
      { type: MapType.Normal, suffix: "_normal" },
      { type: MapType.Diffuse, suffix: "_diffuse" },
      { type: MapType.Metallic, suffix: "_metallic" },
      { type: MapType.Smoothness, suffix: "_smoothness" },
      { type: MapType.AO, suffix: "_ao" },
      { type: MapType.Edge, suffix: "_edge" },
      { type: MapType.Roughness, suffix: "_roughness" },
      { type: MapType.Displacement, suffix: "_displacement" },
      { type: MapType.Specular, suffix: "_specular" },
      { type: MapType.Emissive, suffix: "_emissive" },
      { type: MapType.Opacity, suffix: "_opacity" },
      { type: MapType.Curvature, suffix: "_curvature" },
    ],
    format: "png",
    normalConvention: "opengl",
    notes: "Export all generated maps.",
  },
];
