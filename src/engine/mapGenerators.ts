/**
 * PBR Map Generation Engine
 * Generates all texture maps from a source image using algorithmic approaches.
 */

import { MapType, MapParams, DEFAULT_PARAMS } from "@/types/maps";
import {
  toGrayscale,
  grayscaleToImageData,
  gaussianBlur,
  sobel,
  cannyEdgeDetection,
  normalize,
  applyLevels,
  applyBrightnessContrast,
  invertArray,
  localVariance,
  laplacian,
  sharpen as sharpenArray,
  srgbToLinear,
  linearToSrgb,
} from "./algorithms";

type MapGenerator = (
  sourceImageData: ImageData,
  params: MapParams
) => ImageData;

/** Apply common post-processing (levels, brightness, contrast, blur, sharpen, invert) */
function applyCommonParams(
  gray: Float32Array,
  width: number,
  height: number,
  params: MapParams
): Float32Array {
  let result: Float32Array = gray;

  // Intensity (clamp to valid range to prevent corrupt downstream operations)
  if (params.intensity !== 100) {
    const factor = params.intensity / 100;
    const mapped = new Float32Array(result.length);
    for (let i = 0; i < result.length; i++) mapped[i] = Math.max(0, Math.min(255, result[i] * factor));
    result = mapped;
  }

  // Levels
  if (params.blackPoint !== 0 || params.whitePoint !== 255 || params.gamma !== 1.0) {
    result = applyLevels(result, params.blackPoint, params.whitePoint, params.gamma);
  }

  // Brightness & Contrast
  if (params.brightness !== 0 || params.contrast !== 100) {
    result = applyBrightnessContrast(result, params.brightness, params.contrast);
  }

  // Blur
  if (params.blur > 0) {
    result = gaussianBlur(result, width, height, params.blur);
  }

  // Sharpen
  if (params.sharpen > 0) {
    result = sharpenArray(result, width, height, params.sharpen);
  }

  // Invert
  if (params.invert) {
    result = invertArray(result);
  }

  return result;
}

/** Apply common post-processing to a color (RGB) ImageData by processing each channel independently */
function applyCommonParamsColor(
  imageData: ImageData,
  params: MapParams
): ImageData {
  const { width, height, data } = imageData;
  const total = width * height;

  // Extract RGB channels as Float32Arrays
  const r = new Float32Array(total);
  const g = new Float32Array(total);
  const b = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    r[i] = data[i * 4];
    g[i] = data[i * 4 + 1];
    b[i] = data[i * 4 + 2];
  }

  // Apply common params to each channel independently
  const rResult = applyCommonParams(r, width, height, params);
  const gResult = applyCommonParams(g, width, height, params);
  const bResult = applyCommonParams(b, width, height, params);

  // Reassemble into ImageData
  const output = new ImageData(width, height);
  for (let i = 0; i < total; i++) {
    output.data[i * 4] = Math.max(0, Math.min(255, Math.round(rResult[i])));
    output.data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(gResult[i])));
    output.data[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(bResult[i])));
    output.data[i * 4 + 3] = 255;
  }

  return output;
}

/** Height Map: Grayscale luminance with depth estimation */
export function generateHeightMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height } = sourceImageData;
  let gray = toGrayscale(sourceImageData);

  // Pre-blur to smooth out source noise before height extraction
  const preBlur = (params.heightPreBlur as number) ?? 1.0;
  if (preBlur > 0) {
    gray = gaussianBlur(gray, width, height, preBlur);
  }

  // Normalize
  gray = normalize(gray);

  // Apply common params
  gray = applyCommonParams(gray, width, height, params);

  return grayscaleToImageData(gray, width, height);
}

/** Normal Map: Computed from height via Sobel derivatives */
export function generateNormalMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height } = sourceImageData;

  // First generate height map
  let gray = toGrayscale(sourceImageData);
  const preBlur = (params.normalPreBlur as number) ?? 1.0;
  if (preBlur > 0) {
    gray = gaussianBlur(gray, width, height, preBlur);
  }
  gray = normalize(gray);

  // Apply common params to height BEFORE computing normals
  // This makes blur/sharpen/contrast/levels/invert affect the normal computation
  gray = applyCommonParams(gray, width, height, params);

  const strength = ((params.normalStrength as number) || 2.0);

  // Sobel derivatives
  const { gx, gy } = sobel(gray, width, height);

  const imageData = new ImageData(width, height);
  const { data } = imageData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const px = idx * 4;

      // Normal vector from height gradients
      const nx = -gx[idx] * strength / 255;
      const ny = -gy[idx] * strength / 255;
      const nz = 1.0;

      // Normalize
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      // Map to 0-255 range (tangent space: 0.5 centered)
      data[px] = Math.round(((nx / len) * 0.5 + 0.5) * 255);     // R
      data[px + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255); // G
      data[px + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255); // B
      data[px + 3] = 255; // A
    }
  }

  return imageData;
}

/** Diffuse Map: De-lit source image */
export function generateDiffuseMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height, data: srcData } = sourceImageData;
  const deLightStrength = (params.deLightStrength as number ?? 50) / 100;

  // Compute luminance
  const gray = toGrayscale(sourceImageData);

  // Low-frequency illumination (large blur)
  const illumination = gaussianBlur(gray, width, height, Math.max(width, height) * 0.05);

  const imageData = new ImageData(width, height);
  const { data } = imageData;

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    const illum = Math.max(illumination[i] / 255, 0.01);
    const factor = 1.0 / illum;
    const blend = 1.0 - deLightStrength + deLightStrength * factor;

    // Convert to linear, apply, convert back
    for (let c = 0; c < 3; c++) {
      const linear = srgbToLinear(srcData[px + c]);
      const adjusted = linear * blend;
      data[px + c] = Math.round(linearToSrgb(adjusted));
    }
    data[px + 3] = 255;
  }

  // Apply common params (brightness, contrast, blur, etc.) per-channel
  return applyCommonParamsColor(imageData, params);
}

/** Metallic Map: Heuristic based on specular analysis */
export function generateMetallicMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height, data: srcData } = sourceImageData;
  const threshold = (params.metallicThreshold as number ?? 50) / 100;

  const result = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    const r = srcData[px], g = srcData[px + 1], b = srcData[px + 2];

    // Metallic heuristic:
    // 1. High luminance + low saturation → might be metal
    const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;

    // Metals tend to have higher reflectance and colored specular
    const reflectance = lum;
    // High reflectance + moderate saturation = metal
    const metalScore = reflectance * 0.6 + (1 - saturation) * 0.2 + (lum > 0.5 ? 0.2 : 0);

    result[i] = metalScore > threshold ? (metalScore - threshold) / (1 - threshold) * 255 : 0;
  }

  // Don't normalize() — that would stretch even non-metallic images to full 0-255,
  // causing false metallic regions. Instead, just clamp to valid range.
  const clamped = new Float32Array(result.length);
  for (let i = 0; i < result.length; i++) {
    clamped[i] = Math.max(0, Math.min(255, result[i]));
  }

  let gray = applyCommonParams(clamped, width, height, params);
  return grayscaleToImageData(gray, width, height);
}

/** Smoothness Map: Based on local texture analysis */
export function generateSmoothnessMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height } = sourceImageData;
  const gray = toGrayscale(sourceImageData);
  const textureScale = (params.textureScale as number) || 7;

  // Local variance (texture roughness indicator)
  const variance = localVariance(gray, width, height, textureScale);
  const normalizedVar = normalize(variance);

  // Edge density via Sobel magnitude
  const { magnitude } = sobel(gray, width, height);
  const normalizedMag = normalize(magnitude);

  // High-frequency energy via Laplacian
  const lap = laplacian(gray, width, height);
  const absLap = new Float32Array(lap.length);
  for (let i = 0; i < lap.length; i++) absLap[i] = Math.abs(lap[i]);
  const normalizedLap = normalize(absLap);

  // Combine: roughness = weighted sum
  const roughness = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    roughness[i] = normalizedVar[i] * 0.4 + normalizedMag[i] * 0.3 + normalizedLap[i] * 0.3;
  }

  // Smoothness = inverted roughness
  let smoothness = invertArray(normalize(roughness));
  smoothness = applyCommonParams(smoothness, width, height, params);
  return grayscaleToImageData(smoothness, width, height);
}

/** AO Map: Multi-scale ambient occlusion from height */
export function generateAOMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height } = sourceImageData;
  const aoRadius = (params.aoRadius as number) || 8;
  const aoIntensity = ((params.aoIntensity as number) || 100) / 100;
  const samples = 16;

  // Get height
  let heightGray = toGrayscale(sourceImageData);
  heightGray = gaussianBlur(heightGray, width, height, 1.0);
  heightGray = normalize(heightGray);

  const ao = new Float32Array(width * height);

  // Multi-scale AO
  const scales = [2, aoRadius, aoRadius * 4];
  const scaleWeights = [0.5, 0.3, 0.2];

  for (let scaleIdx = 0; scaleIdx < scales.length; scaleIdx++) {
    const radius = scales[scaleIdx];
    const weight = scaleWeights[scaleIdx];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerHeight = heightGray[y * width + x];
        let occlusion = 0;

        for (let s = 0; s < samples; s++) {
          const angle = (s / samples) * Math.PI * 2;
          const sx = Math.round(x + Math.cos(angle) * radius);
          const sy = Math.round(y + Math.sin(angle) * radius);

          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const neighborHeight = heightGray[sy * width + sx];
            const diff = neighborHeight - centerHeight;
            if (diff > 0) {
              occlusion += diff / 255;
            }
          }
        }

        ao[y * width + x] += (occlusion / samples) * weight * aoIntensity * 255;
      }
    }
  }

  // AO = 1 - occlusion (white = no occlusion)
  // Normalize the occlusion values to avoid hardcoded clipping
  let maxOcclusion = 0;
  for (let i = 0; i < width * height; i++) {
    if (ao[i] > maxOcclusion) maxOcclusion = ao[i];
  }
  const occlusionScale = maxOcclusion > 0 ? 255 / maxOcclusion : 1;

  let result: Float32Array = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    result[i] = Math.max(0, 255 - ao[i] * occlusionScale);
  }

  result = applyCommonParams(result, width, height, params);
  return grayscaleToImageData(result, width, height);
}

/** Edge Map: Canny/Sobel edge detection */
export function generateEdgeMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height } = sourceImageData;
  const gray = toGrayscale(sourceImageData);
  const lowThreshold = (params.edgeLowThreshold as number) || 50;
  const highThreshold = (params.edgeHighThreshold as number) || 150;

  let edges = cannyEdgeDetection(gray, width, height, lowThreshold, highThreshold);
  edges = applyCommonParams(edges, width, height, params);
  return grayscaleToImageData(edges, width, height);
}

/** Roughness Map: Inverse of smoothness */
export function generateRoughnessMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height } = sourceImageData;
  const gray = toGrayscale(sourceImageData);
  const textureScale = (params.textureScale as number) || 7;

  const variance = localVariance(gray, width, height, textureScale);
  const normalizedVar = normalize(variance);
  const { magnitude } = sobel(gray, width, height);
  const normalizedMag = normalize(magnitude);
  const lap = laplacian(gray, width, height);
  const absLap = new Float32Array(lap.length);
  for (let i = 0; i < lap.length; i++) absLap[i] = Math.abs(lap[i]);
  const normalizedLap = normalize(absLap);

  const roughness = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    roughness[i] = normalizedVar[i] * 0.4 + normalizedMag[i] * 0.3 + normalizedLap[i] * 0.3;
  }

  let result = normalize(roughness);

  // Apply roughness floor: remap 0-255 → floor-255 so no area is mirror-smooth
  const floorPct = ((params.roughnessFloor as number) ?? 20) / 100;
  const floorVal = floorPct * 255;
  if (floorVal > 0) {
    const range = 255 - floorVal;
    for (let i = 0; i < result.length; i++) {
      result[i] = floorVal + (result[i] / 255) * range;
    }
  }

  result = applyCommonParams(result, width, height, params);
  return grayscaleToImageData(result, width, height);
}

/** Displacement Map: Enhanced height with more detail */
export function generateDisplacementMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height } = sourceImageData;
  let gray = toGrayscale(sourceImageData);

  // Detail blend: 0% = all micro (original), 100% = all macro (blurred)
  const detail = ((params.displacementDetail as number) ?? 50) / 100;
  const macro = gaussianBlur(gray, width, height, 3);

  const result = new Float32Array(width * height);
  const microWeight = 1.0 - detail;
  const macroWeight = detail;
  for (let i = 0; i < width * height; i++) {
    result[i] = gray[i] * microWeight + macro[i] * macroWeight;
  }

  gray = normalize(result);
  gray = applyCommonParams(gray, width, height, params);
  return grayscaleToImageData(gray, width, height);
}

/** Specular Map: Fresnel-based estimation */
export function generateSpecularMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height, data: srcData } = sourceImageData;
  const imageData = new ImageData(width, height);
  const { data } = imageData;

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    const r = srcData[px], g = srcData[px + 1], b = srcData[px + 2];

    // F0 for dielectrics ~0.04, for metals use albedo color
    const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC > 0 ? (maxC - minC) / maxC : 0;

    // Estimate metalness
    const metalness = Math.max(0, lum - 0.4) * (1 - sat * 0.5);

    // Blend between dielectric F0 and metal specular
    const specR = 0.04 * (1 - metalness) + (r / 255) * metalness;
    const specG = 0.04 * (1 - metalness) + (g / 255) * metalness;
    const specB = 0.04 * (1 - metalness) + (b / 255) * metalness;

    data[px] = Math.round(specR * 255);
    data[px + 1] = Math.round(specG * 255);
    data[px + 2] = Math.round(specB * 255);
    data[px + 3] = 255;
  }

  // Apply common params per-channel
  return applyCommonParamsColor(imageData, params);
}

/** Emissive Map: Detect bright/glowing regions */
export function generateEmissiveMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height, data: srcData } = sourceImageData;
  const threshold = ((params.emissiveThreshold as number) || 85) / 100;
  const satMin = ((params.emissiveSatMin as number) ?? 10) / 100;
  const imageData = new ImageData(width, height);
  const { data } = imageData;

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    const r = srcData[px], g = srcData[px + 1], b = srcData[px + 2];
    const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    const maxC = Math.max(r, g, b) / 255;
    const sat = maxC > 0 ? (maxC - Math.min(r, g, b) / 255) / maxC : 0;

    // Emissive if: high luminance AND enough saturation
    const isEmissive = lum > threshold && sat > satMin;
    const emissiveStrength = isEmissive ? Math.min(1, (lum - threshold) / (1 - threshold)) : 0;

    data[px] = Math.round(r * emissiveStrength);
    data[px + 1] = Math.round(g * emissiveStrength);
    data[px + 2] = Math.round(b * emissiveStrength);
    data[px + 3] = 255;
  }

  // Apply common params per-channel
  return applyCommonParamsColor(imageData, params);
}

/** Opacity Map: Luminance-based transparency estimation */
export function generateOpacityMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height, data: srcData } = sourceImageData;
  const opacityThreshold = (params.opacityThreshold as number) ?? 2;
  const result = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    // Use alpha channel if available, otherwise luminance-based
    const alpha = srcData[px + 3];
    const lum = (srcData[px] * 0.2126 + srcData[px + 1] * 0.7152 + srcData[px + 2] * 0.0722);
    result[i] = alpha < 255 ? alpha : lum > opacityThreshold ? 255 : 0;
  }

  let gray = applyCommonParams(result, width, height, params);
  return grayscaleToImageData(gray, width, height);
}

/** Curvature Map: Second derivative of height */
export function generateCurvatureMap(sourceImageData: ImageData, params: MapParams): ImageData {
  const { width, height } = sourceImageData;
  let gray = toGrayscale(sourceImageData);
  const preBlur = (params.curvaturePreBlur as number) ?? 1.5;
  if (preBlur > 0) {
    gray = gaussianBlur(gray, width, height, preBlur);
  }
  gray = normalize(gray);

  const lap = laplacian(gray, width, height);
  const multiplier = (params.curvatureMultiplier as number) ?? 2.0;

  // Center at 128 (0.5): concave = darker, convex = lighter
  const result = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    result[i] = Math.max(0, Math.min(255, 128 + lap[i] * multiplier));
  }

  const final = applyCommonParams(result, width, height, params);
  return grayscaleToImageData(final, width, height);
}

/** Map type to generator function mapping */
export const MAP_GENERATORS: Record<MapType, MapGenerator> = {
  [MapType.Height]: generateHeightMap,
  [MapType.Normal]: generateNormalMap,
  [MapType.Diffuse]: generateDiffuseMap,
  [MapType.Metallic]: generateMetallicMap,
  [MapType.Smoothness]: generateSmoothnessMap,
  [MapType.AO]: generateAOMap,
  [MapType.Edge]: generateEdgeMap,
  [MapType.Roughness]: generateRoughnessMap,
  [MapType.Displacement]: generateDisplacementMap,
  [MapType.Specular]: generateSpecularMap,
  [MapType.Emissive]: generateEmissiveMap,
  [MapType.Opacity]: generateOpacityMap,
  [MapType.Curvature]: generateCurvatureMap,
};

/** Generate a single map */
export function generateMap(
  type: MapType,
  sourceImageData: ImageData,
  params?: Partial<MapParams>
): ImageData {
  const fullParams = { ...DEFAULT_PARAMS, ...params } as MapParams;
  const generator = MAP_GENERATORS[type];
  if (!generator) throw new Error(`No generator for map type: ${type}`);
  return generator(sourceImageData, fullParams);
}
