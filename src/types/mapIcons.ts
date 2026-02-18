import {
  Mountain,
  Compass,
  Palette,
  CircleDot,
  Sparkle,
  Eclipse,
  Hexagon,
  Grip,
  ArrowUpDown,
  Sun,
  Lightbulb,
  EyeOff,
  Waves,
} from "lucide-react";
import { MapType } from "./maps";
import type { LucideIcon } from "lucide-react";

/**
 * Icon for each PBR map type, used across sidebar, grids, adjustments, and export UI.
 *
 * Icon choices rationale:
 * - Height:       Mountain     — elevation/terrain
 * - Normal:       Compass      — surface orientation/direction
 * - Diffuse:      Palette      — base color
 * - Metallic:     CircleDot    — metal vs dielectric
 * - Smoothness:   Sparkle      — polished/smooth
 * - AO:           Eclipse      — shadow/occlusion
 * - Edge:         Hexagon      — edge/boundary detection
 * - Roughness:    Grip         — rough surface texture
 * - Displacement: ArrowUpDown  — geometry offset up/down
 * - Specular:     Sun          — reflectance/highlights
 * - Emissive:     Lightbulb    — self-illumination/glow
 * - Opacity:      EyeOff       — transparency/visibility
 * - Curvature:    Waves        — convex/concave curves
 */
export const MAP_ICONS: Record<MapType, LucideIcon> = {
  [MapType.Height]: Mountain,
  [MapType.Normal]: Compass,
  [MapType.Diffuse]: Palette,
  [MapType.Metallic]: CircleDot,
  [MapType.Smoothness]: Sparkle,
  [MapType.AO]: Eclipse,
  [MapType.Edge]: Hexagon,
  [MapType.Roughness]: Grip,
  [MapType.Displacement]: ArrowUpDown,
  [MapType.Specular]: Sun,
  [MapType.Emissive]: Lightbulb,
  [MapType.Opacity]: EyeOff,
  [MapType.Curvature]: Waves,
};
