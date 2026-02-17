/**
 * Professional Image Processing Tools
 * Advanced algorithms for material/texture analysis and manipulation.
 */

import {
  toGrayscale,
  gaussianBlur,
  sobel,
  localVariance,
  laplacian,
} from "./algorithms";

// ─── Make Seamless (Cross-Blend Tiling) ───────────────────────────────────────
/** Make an image seamlessly tileable by cross-blending opposing edges.
 *  Uses a smooth falloff (cosine) at the borders to blend the wrapped
 *  version with the original, eliminating visible seams.
 */
export function makeSeamless(
  imageData: ImageData,
  blendWidth: number = 0.25 // fraction of dimension, 0-0.5
): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;
  const bw = Math.max(1, Math.floor(Math.min(blendWidth, 0.5) * Math.min(width, height)));

  // Copy source first
  dst.set(src);

  // Helper: smooth weight using cosine interpolation
  const weight = (d: number, maxD: number) => {
    if (d >= maxD) return 0;
    return 0.5 * (1 + Math.cos((Math.PI * (maxD - d)) / maxD));
  };

  // Blend left-right edges
  for (let y = 0; y < height; y++) {
    for (let d = 0; d < bw; d++) {
      const w = weight(d, bw);
      const xL = d;
      const xR = width - 1 - d;
      const idxL = (y * width + xL) * 4;
      const idxR = (y * width + xR) * 4;
      for (let c = 0; c < 3; c++) {
        const blended = src[idxL + c] * (1 - w) + src[idxR + c] * w;
        dst[idxL + c] = Math.round(blended);
        dst[(y * width + xR) * 4 + c] = Math.round(
          src[idxR + c] * (1 - w) + src[idxL + c] * w
        );
      }
      dst[idxL + 3] = 255;
      dst[(y * width + xR) * 4 + 3] = 255;
    }
  }

  // Blend top-bottom edges (using the already left-right blended data)
  const intermediate = new Uint8ClampedArray(dst);
  for (let x = 0; x < width; x++) {
    for (let d = 0; d < bw; d++) {
      const w = weight(d, bw);
      const yT = d;
      const yB = height - 1 - d;
      const idxT = (yT * width + x) * 4;
      const idxB = (yB * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        dst[idxT + c] = Math.round(
          intermediate[idxT + c] * (1 - w) + intermediate[idxB + c] * w
        );
        dst[idxB + c] = Math.round(
          intermediate[idxB + c] * (1 - w) + intermediate[idxT + c] * w
        );
      }
    }
  }

  return output;
}

// ─── Emboss Filter ────────────────────────────────────────────────────────────
export function emboss(
  input: Float32Array,
  width: number,
  height: number,
  strength: number = 1.0,
  angle: number = 135  // degrees
): Float32Array {
  const output = new Float32Array(input.length);
  const rad = (angle * Math.PI) / 180;
  const dx = Math.round(Math.cos(rad));
  const dy = Math.round(Math.sin(rad));

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const prev = input[(y - dy) * width + (x - dx)] || input[idx];
      const next = input[(y + dy) * width + (x + dx)] || input[idx];
      output[idx] = Math.max(0, Math.min(255, 128 + (next - prev) * strength));
    }
  }
  return output;
}

// ─── Noise Generator ──────────────────────────────────────────────────────────
export function generateNoise(
  width: number,
  height: number,
  type: "white" | "perlin" | "simplex" = "white",
  scale: number = 50,
  seed: number = 42
): Float32Array {
  const output = new Float32Array(width * height);

  // Seeded PRNG (mulberry32)
  let s = seed | 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  if (type === "white") {
    for (let i = 0; i < output.length; i++) {
      output[i] = rand() * 255;
    }
  } else {
    // Perlin-like noise using value noise with interpolation
    const gridSize = Math.max(2, Math.round(scale));
    const gw = Math.ceil(width / gridSize) + 2;
    const gh = Math.ceil(height / gridSize) + 2;
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gx = x / gridSize;
        const gy = y / gridSize;
        const gx0 = Math.floor(gx);
        const gy0 = Math.floor(gy);
        const fx = gx - gx0;
        const fy = gy - gy0;
        // Smoothstep
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);

        const v00 = grid[gy0 * gw + gx0] ?? 0.5;
        const v10 = grid[gy0 * gw + gx0 + 1] ?? 0.5;
        const v01 = grid[(gy0 + 1) * gw + gx0] ?? 0.5;
        const v11 = grid[(gy0 + 1) * gw + gx0 + 1] ?? 0.5;

        const top = v00 * (1 - sx) + v10 * sx;
        const bottom = v01 * (1 - sx) + v11 * sx;
        output[y * width + x] = (top * (1 - sy) + bottom * sy) * 255;
      }
    }
  }

  return output;
}

// ─── HSL Adjustment ───────────────────────────────────────────────────────────
export function hslAdjust(
  imageData: ImageData,
  hueShift: number = 0,      // -180 to 180
  satScale: number = 1.0,    // 0 to 2 (1 = no change)
  lightScale: number = 1.0   // 0 to 2 (1 = no change)
): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    const r = src[px] / 255, g = src[px + 1] / 255, b = src[px + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    // Adjust
    h = ((h * 360 + hueShift) % 360 + 360) % 360 / 360;
    s = Math.max(0, Math.min(1, s * satScale));
    const nl = Math.max(0, Math.min(1, l * lightScale));

    // HSL to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let nr: number, ng: number, nb: number;
    if (s === 0) {
      nr = ng = nb = nl;
    } else {
      const q = nl < 0.5 ? nl * (1 + s) : nl + s - nl * s;
      const p = 2 * nl - q;
      nr = hue2rgb(p, q, h + 1/3);
      ng = hue2rgb(p, q, h);
      nb = hue2rgb(p, q, h - 1/3);
    }

    dst[px] = Math.round(nr * 255);
    dst[px + 1] = Math.round(ng * 255);
    dst[px + 2] = Math.round(nb * 255);
    dst[px + 3] = 255;
  }
  return output;
}

// ─── Desaturate (multiple methods) ────────────────────────────────────────────
export function desaturate(
  imageData: ImageData,
  method: "luminance" | "average" | "lightness" | "max" = "luminance",
  amount: number = 1.0  // 0-1, partial desaturation
): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    const r = src[px], g = src[px + 1], b = src[px + 2];
    let gray: number;
    switch (method) {
      case "luminance": gray = r * 0.2126 + g * 0.7152 + b * 0.0722; break;
      case "average": gray = (r + g + b) / 3; break;
      case "lightness": gray = (Math.max(r, g, b) + Math.min(r, g, b)) / 2; break;
      case "max": gray = Math.max(r, g, b); break;
    }
    dst[px] = Math.round(r * (1 - amount) + gray * amount);
    dst[px + 1] = Math.round(g * (1 - amount) + gray * amount);
    dst[px + 2] = Math.round(b * (1 - amount) + gray * amount);
    dst[px + 3] = 255;
  }
  return output;
}

// ─── Color Bilateral Filter (preserves color) ────────────────────────────────
export function bilateralFilterColor(
  imageData: ImageData,
  spatialSigma: number = 3,
  rangeSigma: number = 30
): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;
  const radius = Math.ceil(spatialSigma * 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cIdx = (y * width + x) * 4;
      const cr = src[cIdx], cg = src[cIdx + 1], cb = src[cIdx + 2];
      let wSum = 0, rSum = 0, gSum = 0, bSum = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const nIdx = (ny * width + nx) * 4;
          const nr = src[nIdx], ng = src[nIdx + 1], nb = src[nIdx + 2];

          const spatialDist = dx * dx + dy * dy;
          const rangeDist = (cr - nr) ** 2 + (cg - ng) ** 2 + (cb - nb) ** 2;

          const w =
            Math.exp(-spatialDist / (2 * spatialSigma * spatialSigma)) *
            Math.exp(-rangeDist / (2 * rangeSigma * rangeSigma * 3)); // *3 for 3 channels

          wSum += w;
          rSum += nr * w;
          gSum += ng * w;
          bSum += nb * w;
        }
      }

      dst[cIdx] = Math.round(rSum / (wSum || 1));
      dst[cIdx + 1] = Math.round(gSum / (wSum || 1));
      dst[cIdx + 2] = Math.round(bSum / (wSum || 1));
      dst[cIdx + 3] = 255;
    }
  }
  return output;
}

// ─── Color Median Filter (preserves color) ───────────────────────────────────
export function medianFilterColor(
  imageData: ImageData,
  radius: number = 1
): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;
  const windowSize = (2 * radius + 1) * (2 * radius + 1);
  const rVals = new Float32Array(windowSize);
  const gVals = new Float32Array(windowSize);
  const bVals = new Float32Array(windowSize);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const idx = (ny * width + nx) * 4;
          rVals[count] = src[idx];
          gVals[count] = src[idx + 1];
          bVals[count] = src[idx + 2];
          count++;
        }
      }
      rVals.subarray(0, count).sort();
      gVals.subarray(0, count).sort();
      bVals.subarray(0, count).sort();
      const mid = Math.floor(count / 2);
      const oIdx = (y * width + x) * 4;
      dst[oIdx] = rVals[mid];
      dst[oIdx + 1] = gVals[mid];
      dst[oIdx + 2] = bVals[mid];
      dst[oIdx + 3] = 255;
    }
  }
  return output;
}

// ─── Add Noise to Image ──────────────────────────────────────────────────────
export function addNoise(
  imageData: ImageData,
  amount: number = 20,    // 0-100
  monochrome: boolean = true,
  seed: number = Date.now()
): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;

  let s = seed | 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const strength = amount * 2.55;

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    if (monochrome) {
      const noise = (rand() - 0.5) * strength;
      dst[px] = Math.max(0, Math.min(255, src[px] + noise));
      dst[px + 1] = Math.max(0, Math.min(255, src[px + 1] + noise));
      dst[px + 2] = Math.max(0, Math.min(255, src[px + 2] + noise));
    } else {
      dst[px] = Math.max(0, Math.min(255, src[px] + (rand() - 0.5) * strength));
      dst[px + 1] = Math.max(0, Math.min(255, src[px + 1] + (rand() - 0.5) * strength));
      dst[px + 2] = Math.max(0, Math.min(255, src[px + 2] + (rand() - 0.5) * strength));
    }
    dst[px + 3] = 255;
  }
  return output;
}

// ─── Invert Colors (RGB) ─────────────────────────────────────────────────────
export function invertColors(imageData: ImageData): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;
  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    dst[px] = 255 - src[px];
    dst[px + 1] = 255 - src[px + 1];
    dst[px + 2] = 255 - src[px + 2];
    dst[px + 3] = 255;
  }
  return output;
}

// ─── Unsharp Mask (advanced sharpen with threshold) ──────────────────────────
export function unsharpMask(
  imageData: ImageData,
  radius: number = 2,
  amount: number = 1.5,   // 0-5
  threshold: number = 0    // 0-255, only sharpen diffs above this
): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;

  // Process each channel separately
  for (let c = 0; c < 3; c++) {
    const channel = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) channel[i] = src[i * 4 + c];
    const blurred = gaussianBlur(channel, width, height, radius);
    for (let i = 0; i < width * height; i++) {
      const diff = channel[i] - blurred[i];
      if (Math.abs(diff) >= threshold) {
        dst[i * 4 + c] = Math.max(0, Math.min(255, Math.round(channel[i] + diff * amount)));
      } else {
        dst[i * 4 + c] = Math.round(channel[i]);
      }
    }
  }
  for (let i = 0; i < width * height; i++) dst[i * 4 + 3] = 255;
  return output;
}

// ─── Vignette ─────────────────────────────────────────────────────────────────
export function vignette(
  imageData: ImageData,
  amount: number = 0.5,   // 0-1
  radius: number = 0.8    // 0-1 (how far from center vignette starts)
): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;
  const cx = width / 2, cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = (y * width + x) * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
      const factor = 1 - Math.max(0, (dist - radius) / (1 - radius)) * amount;
      const f = Math.max(0, factor);
      dst[px] = Math.round(src[px] * f);
      dst[px + 1] = Math.round(src[px + 1] * f);
      dst[px + 2] = Math.round(src[px + 2] * f);
      dst[px + 3] = 255;
    }
  }
  return output;
}

// ─── Normal Map Normalize (re-normalize tangent-space normals) ────────────────
export function renormalizeNormalMap(imageData: ImageData): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    let nx = (src[px] / 255) * 2 - 1;
    let ny = (src[px + 1] / 255) * 2 - 1;
    let nz = (src[px + 2] / 255) * 2 - 1;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= len; ny /= len; nz /= len;
    dst[px] = Math.round((nx * 0.5 + 0.5) * 255);
    dst[px + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    dst[px + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    dst[px + 3] = 255;
  }
  return output;
}

// ─── Flip Normal Map Y (OpenGL ↔ DirectX conversion) ─────────────────────────
export function flipNormalY(imageData: ImageData): ImageData {
  const { width, height, data: src } = imageData;
  const output = new ImageData(width, height);
  const { data: dst } = output;

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    dst[px] = src[px];           // R (X) stays
    dst[px + 1] = 255 - src[px + 1]; // G (Y) inverted
    dst[px + 2] = src[px + 2];  // B (Z) stays
    dst[px + 3] = 255;
  }
  return output;
}

// ─── Bilateral Filter (edge-preserving blur) ──────────────────────────────────
export function bilateralFilter(
  input: Float32Array,
  width: number,
  height: number,
  spatialSigma: number = 3,
  rangeSigma: number = 30
): Float32Array {
  const output = new Float32Array(input.length);
  const radius = Math.ceil(spatialSigma * 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerVal = input[y * width + x];
      let weightSum = 0;
      let valueSum = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const neighborVal = input[ny * width + nx];

          const spatialDist = dx * dx + dy * dy;
          const rangeDist = (centerVal - neighborVal) * (centerVal - neighborVal);

          const weight =
            Math.exp(-spatialDist / (2 * spatialSigma * spatialSigma)) *
            Math.exp(-rangeDist / (2 * rangeSigma * rangeSigma));

          weightSum += weight;
          valueSum += neighborVal * weight;
        }
      }

      output[y * width + x] = valueSum / (weightSum || 1);
    }
  }
  return output;
}

// ─── Median Filter (noise reduction) ──────────────────────────────────────────
export function medianFilter(
  input: Float32Array,
  width: number,
  height: number,
  radius: number = 1
): Float32Array {
  const output = new Float32Array(input.length);
  const windowSize = (2 * radius + 1) * (2 * radius + 1);
  const values = new Float32Array(windowSize);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          values[count++] = input[ny * width + nx];
        }
      }
      values.subarray(0, count).sort();
      output[y * width + x] = values[Math.floor(count / 2)];
    }
  }
  return output;
}

// ─── Morphological Operations ─────────────────────────────────────────────────
export function morphologicalDilate(
  input: Float32Array,
  width: number,
  height: number,
  radius: number = 1
): Float32Array {
  const output = new Float32Array(input.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = -Infinity;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          maxVal = Math.max(maxVal, input[ny * width + nx]);
        }
      }
      output[y * width + x] = maxVal;
    }
  }
  return output;
}

export function morphologicalErode(
  input: Float32Array,
  width: number,
  height: number,
  radius: number = 1
): Float32Array {
  const output = new Float32Array(input.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = Infinity;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          minVal = Math.min(minVal, input[ny * width + nx]);
        }
      }
      output[y * width + x] = minVal;
    }
  }
  return output;
}

export function morphologicalOpen(
  input: Float32Array,
  width: number,
  height: number,
  radius: number = 1
): Float32Array {
  return morphologicalDilate(
    morphologicalErode(input, width, height, radius),
    width, height, radius
  );
}

export function morphologicalClose(
  input: Float32Array,
  width: number,
  height: number,
  radius: number = 1
): Float32Array {
  return morphologicalErode(
    morphologicalDilate(input, width, height, radius),
    width, height, radius
  );
}

// ─── Histogram Equalization ───────────────────────────────────────────────────
export function histogramEqualization(
  input: Float32Array,
  width: number,
  height: number
): Float32Array {
  const histogram = new Uint32Array(256);
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    histogram[Math.max(0, Math.min(255, Math.round(input[i])))]++;
  }

  // CDF
  const cdf = new Float32Array(256);
  cdf[0] = histogram[0];
  for (let i = 1; i < 256; i++) {
    cdf[i] = cdf[i - 1] + histogram[i];
  }

  // Normalize CDF
  const cdfMin = cdf.find((v) => v > 0) || 0;
  const output = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const bin = Math.max(0, Math.min(255, Math.round(input[i])));
    output[i] = ((cdf[bin] - cdfMin) / (totalPixels - cdfMin)) * 255;
  }

  return output;
}

// ─── CLAHE (Contrast Limited Adaptive Histogram Equalization) ─────────────────
export function clahe(
  input: Float32Array,
  width: number,
  height: number,
  tileSize: number = 32,
  clipLimit: number = 3.0
): Float32Array {
  const output = new Float32Array(input.length);
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);

  // Process each tile
  const tileMaps: Float32Array[][] = [];
  for (let ty = 0; ty < tilesY; ty++) {
    tileMaps[ty] = [];
    for (let tx = 0; tx < tilesX; tx++) {
      const startX = tx * tileSize;
      const startY = ty * tileSize;
      const endX = Math.min(startX + tileSize, width);
      const endY = Math.min(startY + tileSize, height);
      const tilePixels = (endX - startX) * (endY - startY);

      // Compute histogram for tile
      const histogram = new Float32Array(256);
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          histogram[Math.max(0, Math.min(255, Math.round(input[y * width + x])))]++;
        }
      }

      // Clip histogram
      const clipCount = Math.floor(clipLimit * tilePixels / 256);
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (histogram[i] > clipCount) {
          excess += histogram[i] - clipCount;
          histogram[i] = clipCount;
        }
      }
      const redistribution = excess / 256;
      for (let i = 0; i < 256; i++) {
        histogram[i] += redistribution;
      }

      // CDF
      const cdf = new Float32Array(256);
      cdf[0] = histogram[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + histogram[i];
      }

      // Normalize
      const map = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        map[i] = (cdf[i] / tilePixels) * 255;
      }
      tileMaps[ty][tx] = map;
    }
  }

  // Bilinear interpolation between tile mappings
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tx = x / tileSize - 0.5;
      const ty = y / tileSize - 0.5;
      const tx0 = Math.max(0, Math.floor(tx));
      const ty0 = Math.max(0, Math.floor(ty));
      const tx1 = Math.min(tilesX - 1, tx0 + 1);
      const ty1 = Math.min(tilesY - 1, ty0 + 1);
      const fx = tx - tx0;
      const fy = ty - ty0;

      const bin = Math.max(0, Math.min(255, Math.round(input[y * width + x])));
      const v00 = tileMaps[ty0]?.[tx0]?.[bin] ?? bin;
      const v10 = tileMaps[ty0]?.[tx1]?.[bin] ?? bin;
      const v01 = tileMaps[ty1]?.[tx0]?.[bin] ?? bin;
      const v11 = tileMaps[ty1]?.[tx1]?.[bin] ?? bin;

      output[y * width + x] =
        v00 * (1 - fx) * (1 - fy) +
        v10 * fx * (1 - fy) +
        v01 * (1 - fx) * fy +
        v11 * fx * fy;
    }
  }

  return output;
}

// ─── Frequency Separation (Low + High frequency decomposition) ────────────────
export function frequencySeparation(
  input: Float32Array,
  width: number,
  height: number,
  sigma: number = 5
): { low: Float32Array; high: Float32Array } {
  const low = gaussianBlur(input, width, height, sigma);
  const high = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    high[i] = input[i] - low[i] + 128;
  }
  return { low, high };
}

// ─── Color Space Conversions ──────────────────────────────────────────────────
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // sRGB to linear
  let rl = r / 255, gl = g / 255, bl = b / 255;
  rl = rl > 0.04045 ? Math.pow((rl + 0.055) / 1.055, 2.4) : rl / 12.92;
  gl = gl > 0.04045 ? Math.pow((gl + 0.055) / 1.055, 2.4) : gl / 12.92;
  bl = bl > 0.04045 ? Math.pow((bl + 0.055) / 1.055, 2.4) : bl / 12.92;

  // Linear RGB to XYZ (D65)
  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  let y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750);
  let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;

  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  x = f(x); y = f(y); z = f(z);

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

// ─── Texture Analysis ─────────────────────────────────────────────────────────
export function computeTextureComplexity(
  imageData: ImageData
): { complexity: number; detail: string } {
  const gray = toGrayscale(imageData);
  const { width, height } = imageData;
  const { magnitude } = sobel(gray, width, height);
  const variance = localVariance(gray, width, height, 5);
  const lap = laplacian(gray, width, height);

  let edgeEnergy = 0;
  let varianceEnergy = 0;
  let lapEnergy = 0;
  const total = width * height;

  for (let i = 0; i < total; i++) {
    edgeEnergy += magnitude[i];
    varianceEnergy += variance[i];
    lapEnergy += Math.abs(lap[i]);
  }

  edgeEnergy /= total;
  varianceEnergy /= total;
  lapEnergy /= total;

  const complexity = Math.min(100, (edgeEnergy * 0.3 + varianceEnergy * 0.4 + lapEnergy * 0.3) / 2.55);

  let detail: string;
  if (complexity < 15) detail = "Very smooth / uniform texture";
  else if (complexity < 30) detail = "Low complexity — subtle gradients";
  else if (complexity < 50) detail = "Medium complexity — moderate detail";
  else if (complexity < 70) detail = "High complexity — rich detail";
  else detail = "Very high complexity — dense texture";

  return { complexity: Math.round(complexity), detail };
}

// ─── Seamless Tiling Check ────────────────────────────────────────────────────
export function computeSeamScore(imageData: ImageData): {
  score: number;
  horizontalScore: number;
  verticalScore: number;
} {
  const { width, height, data } = imageData;

  let hDiff = 0, vDiff = 0;
  const channelWeight = [0.2126, 0.7152, 0.0722];

  // Horizontal seam (left vs right edge)
  for (let y = 0; y < height; y++) {
    for (let c = 0; c < 3; c++) {
      const left = data[(y * width) * 4 + c];
      const right = data[(y * width + width - 1) * 4 + c];
      hDiff += Math.abs(left - right) * channelWeight[c];
    }
  }

  // Vertical seam (top vs bottom edge)
  for (let x = 0; x < width; x++) {
    for (let c = 0; c < 3; c++) {
      const top = data[x * 4 + c];
      const bottom = data[((height - 1) * width + x) * 4 + c];
      vDiff += Math.abs(top - bottom) * channelWeight[c];
    }
  }

  hDiff /= height;
  vDiff /= width;

  const horizontalScore = Math.max(0, 100 - hDiff * 2);
  const verticalScore = Math.max(0, 100 - vDiff * 2);
  const score = (horizontalScore + verticalScore) / 2;

  return {
    score: Math.round(score),
    horizontalScore: Math.round(horizontalScore),
    verticalScore: Math.round(verticalScore),
  };
}

// ─── Seam Heat-Map ────────────────────────────────────────────────────────────
/** Generate a heat-map showing edge seam discontinuity.
 *  Red = strong discontinuity (will be visible when tiled), Green = seamless. */
export function computeSeamHeatmap(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);

  // Compare each pixel with the pixel that would be adjacent when tiled
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let diff = 0;
      let count = 0;

      // How close to each edge?
      const edgeDist = Math.min(x, width - 1 - x, y, height - 1 - y);
      const maxBand = Math.min(32, Math.min(width, height) / 4);

      if (edgeDist < maxBand) {
        // Left edge: compare with right side
        if (x < maxBand) {
          const mirrorX = width - 1 - x;
          const mirrorIdx = (y * width + mirrorX) * 4;
          for (let c = 0; c < 3; c++) {
            diff += Math.abs(data[idx + c] - data[mirrorIdx + c]);
          }
          count += 3;
        }
        // Right edge: compare with left side
        if (x >= width - maxBand) {
          const mirrorX = width - 1 - x;
          const mirrorIdx = (y * width + mirrorX) * 4;
          for (let c = 0; c < 3; c++) {
            diff += Math.abs(data[idx + c] - data[mirrorIdx + c]);
          }
          count += 3;
        }
        // Top edge: compare with bottom side
        if (y < maxBand) {
          const mirrorY = height - 1 - y;
          const mirrorIdx = (mirrorY * width + x) * 4;
          for (let c = 0; c < 3; c++) {
            diff += Math.abs(data[idx + c] - data[mirrorIdx + c]);
          }
          count += 3;
        }
        // Bottom edge: compare with top side
        if (y >= height - maxBand) {
          const mirrorY = height - 1 - y;
          const mirrorIdx = (mirrorY * width + x) * 4;
          for (let c = 0; c < 3; c++) {
            diff += Math.abs(data[idx + c] - data[mirrorIdx + c]);
          }
          count += 3;
        }
      }

      if (count > 0) {
        const avgDiff = diff / count;
        const intensity = Math.min(255, avgDiff * 3);
        // Red = bad seam, green = good seam
        out.data[idx] = Math.round(intensity);
        out.data[idx + 1] = Math.round(255 - intensity);
        out.data[idx + 2] = 0;
        out.data[idx + 3] = Math.round(128 + (intensity / 255) * 127);
      } else {
        // Interior: transparent
        out.data[idx] = 0;
        out.data[idx + 1] = 0;
        out.data[idx + 2] = 0;
        out.data[idx + 3] = 0;
      }
    }
  }
  return out;
}

// ─── Color Palette Extraction ─────────────────────────────────────────────────
export function extractColorPalette(
  imageData: ImageData,
  numColors: number = 8
): { r: number; g: number; b: number; hex: string; percentage: number }[] {
  const { data } = imageData;
  const pixelCount = data.length / 4;

  // k-means clustering on colors (simplified)
  const sampleSize = Math.min(pixelCount, 10000);
  const step = Math.max(1, Math.floor(pixelCount / sampleSize));
  const samples: [number, number, number][] = [];

  for (let i = 0; i < pixelCount; i += step) {
    const idx = i * 4;
    samples.push([data[idx], data[idx + 1], data[idx + 2]]);
  }

  // Initialize centroids randomly
  const centroids: [number, number, number][] = [];
  for (let i = 0; i < numColors; i++) {
    centroids.push([...samples[Math.floor(Math.random() * samples.length)]]);
  }

  // Run k-means for 10 iterations
  const assignments = new Uint8Array(samples.length);
  for (let iter = 0; iter < 10; iter++) {
    // Assign
    for (let i = 0; i < samples.length; i++) {
      let minDist = Infinity;
      for (let k = 0; k < numColors; k++) {
        const dr = samples[i][0] - centroids[k][0];
        const dg = samples[i][1] - centroids[k][1];
        const db = samples[i][2] - centroids[k][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          assignments[i] = k;
        }
      }
    }

    // Update centroids
    const sums = Array.from({ length: numColors }, () => [0, 0, 0, 0]);
    for (let i = 0; i < samples.length; i++) {
      const k = assignments[i];
      sums[k][0] += samples[i][0];
      sums[k][1] += samples[i][1];
      sums[k][2] += samples[i][2];
      sums[k][3]++;
    }
    for (let k = 0; k < numColors; k++) {
      if (sums[k][3] > 0) {
        centroids[k] = [
          sums[k][0] / sums[k][3],
          sums[k][1] / sums[k][3],
          sums[k][2] / sums[k][3],
        ];
      }
    }
  }

  // Count cluster sizes
  const counts = new Uint32Array(numColors);
  for (let i = 0; i < assignments.length; i++) {
    counts[assignments[i]]++;
  }

  const palette = centroids.map((c, i) => {
    const r = Math.round(c[0]);
    const g = Math.round(c[1]);
    const b = Math.round(c[2]);
    return {
      r, g, b,
      hex: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
      percentage: Math.round((counts[i] / samples.length) * 100),
    };
  });

  // Sort by percentage descending
  palette.sort((a, b) => b.percentage - a.percentage);
  return palette.filter((p) => p.percentage > 0);
}

// ─── Channel Mixer ────────────────────────────────────────────────────────────
export function channelMix(
  imageData: ImageData,
  rWeights: [number, number, number],
  gWeights: [number, number, number],
  bWeights: [number, number, number]
): ImageData {
  const { width, height, data: srcData } = imageData;
  const output = new ImageData(width, height);
  const { data } = output;

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    const r = srcData[px], g = srcData[px + 1], b = srcData[px + 2];

    data[px] = Math.max(0, Math.min(255, r * rWeights[0] + g * rWeights[1] + b * rWeights[2]));
    data[px + 1] = Math.max(0, Math.min(255, r * gWeights[0] + g * gWeights[1] + b * gWeights[2]));
    data[px + 2] = Math.max(0, Math.min(255, r * bWeights[0] + g * bWeights[1] + b * bWeights[2]));
    data[px + 3] = 255;
  }

  return output;
}

// ─── Gradient Map ─────────────────────────────────────────────────────────────
export function applyGradientMap(
  imageData: ImageData,
  colors: { stop: number; r: number; g: number; b: number }[]
): ImageData {
  const { width, height, data: srcData } = imageData;
  const output = new ImageData(width, height);
  const { data } = output;

  colors.sort((a, b) => a.stop - b.stop);

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    const lum = (srcData[px] * 0.2126 + srcData[px + 1] * 0.7152 + srcData[px + 2] * 0.0722) / 255;

    // Find surrounding stops
    let lower = colors[0];
    let upper = colors[colors.length - 1];
    for (let j = 0; j < colors.length - 1; j++) {
      if (lum >= colors[j].stop && lum <= colors[j + 1].stop) {
        lower = colors[j];
        upper = colors[j + 1];
        break;
      }
    }

    const t = upper.stop !== lower.stop ? (lum - lower.stop) / (upper.stop - lower.stop) : 0;
    data[px] = Math.round(lower.r + (upper.r - lower.r) * t);
    data[px + 1] = Math.round(lower.g + (upper.g - lower.g) * t);
    data[px + 2] = Math.round(lower.b + (upper.b - lower.b) * t);
    data[px + 3] = 255;
  }

  return output;
}

// ─── Height-to-Normal with Scharr operator (higher accuracy) ──────────────────
export function scharrNormals(
  heightMap: Float32Array,
  width: number,
  height: number,
  strength: number = 2.0
): ImageData {
  const imageData = new ImageData(width, height);
  const { data } = imageData;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Scharr kernels (more accurate than Sobel)
      const tl = heightMap[(y - 1) * width + (x - 1)];
      const tc = heightMap[(y - 1) * width + x];
      const tr = heightMap[(y - 1) * width + (x + 1)];
      const ml = heightMap[y * width + (x - 1)];
      const mr = heightMap[y * width + (x + 1)];
      const bl = heightMap[(y + 1) * width + (x - 1)];
      const bc = heightMap[(y + 1) * width + x];
      const br = heightMap[(y + 1) * width + (x + 1)];

      const gx = (-3 * tl - 10 * ml - 3 * bl + 3 * tr + 10 * mr + 3 * br) / 32;
      const gy = (-3 * tl - 10 * tc - 3 * tr + 3 * bl + 10 * bc + 3 * br) / 32;

      const nx = -gx * strength / 255;
      const ny = -gy * strength / 255;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      const px = idx * 4;
      data[px] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      data[px + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      data[px + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      data[px + 3] = 255;
    }
  }

  return imageData;
}

// ─── Auto White Balance ───────────────────────────────────────────────────────
export function autoWhiteBalance(imageData: ImageData): ImageData {
  const { width, height, data: srcData } = imageData;
  const output = new ImageData(width, height);
  const { data } = output;
  const total = width * height;

  let avgR = 0, avgG = 0, avgB = 0;
  for (let i = 0; i < total; i++) {
    avgR += srcData[i * 4];
    avgG += srcData[i * 4 + 1];
    avgB += srcData[i * 4 + 2];
  }
  avgR /= total; avgG /= total; avgB /= total;

  const avgGray = (avgR + avgG + avgB) / 3;
  const scaleR = avgGray / (avgR || 1);
  const scaleG = avgGray / (avgG || 1);
  const scaleB = avgGray / (avgB || 1);

  for (let i = 0; i < total; i++) {
    const px = i * 4;
    data[px] = Math.max(0, Math.min(255, Math.round(srcData[px] * scaleR)));
    data[px + 1] = Math.max(0, Math.min(255, Math.round(srcData[px + 1] * scaleG)));
    data[px + 2] = Math.max(0, Math.min(255, Math.round(srcData[px + 2] * scaleB)));
    data[px + 3] = 255;
  }

  return output;
}

// ─── Posterize ────────────────────────────────────────────────────────────────
export function posterize(imageData: ImageData, levels: number = 4): ImageData {
  const { width, height, data: srcData } = imageData;
  const output = new ImageData(width, height);
  const { data } = output;
  const step = 255 / (levels - 1);

  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    for (let c = 0; c < 3; c++) {
      data[px + c] = Math.round(Math.round(srcData[px + c] / step) * step);
    }
    data[px + 3] = 255;
  }

  return output;
}

// ─── Threshold ────────────────────────────────────────────────────────────────
export function adaptiveThreshold(
  input: Float32Array,
  width: number,
  height: number,
  blockSize: number = 15,
  offset: number = 5
): Float32Array {
  const blurred = gaussianBlur(input, width, height, blockSize / 3);
  const output = new Float32Array(input.length);

  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] > blurred[i] - offset ? 255 : 0;
  }

  return output;
}

// ─── Texture Statistics ───────────────────────────────────────────────────────
export function computeTextureStats(imageData: ImageData): {
  entropy: number;
  energy: number;
  contrast: number;
  homogeneity: number;
  meanLuminance: number;
  stdLuminance: number;
  dynamicRange: number;
} {
  const gray = toGrayscale(imageData);
  const total = gray.length;

  // Mean and std
  let sum = 0;
  for (let i = 0; i < total; i++) sum += gray[i];
  const mean = sum / total;

  let variance = 0;
  for (let i = 0; i < total; i++) {
    const diff = gray[i] - mean;
    variance += diff * diff;
  }
  const std = Math.sqrt(variance / total);

  // Histogram for entropy
  const histogram = new Float32Array(256);
  let minVal = 255, maxVal = 0;
  for (let i = 0; i < total; i++) {
    const v = Math.max(0, Math.min(255, Math.round(gray[i])));
    histogram[v]++;
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }

  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    const p = histogram[i] / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }

  // Energy (sum of squared probabilities)
  let energy = 0;
  for (let i = 0; i < 256; i++) {
    const p = histogram[i] / total;
    energy += p * p;
  }

  // GLCM-inspired contrast and homogeneity (simplified)
  let glcmContrast = 0;
  let homogeneity = 0;
  const sampleStep = Math.max(1, Math.floor(total / 50000));
  let sampleCount = 0;
  for (let i = 0; i < total - 1; i += sampleStep) {
    const diff = Math.abs(gray[i] - gray[i + 1]);
    glcmContrast += diff * diff;
    homogeneity += 1 / (1 + diff);
    sampleCount++;
  }
  glcmContrast /= sampleCount;
  homogeneity /= sampleCount;

  return {
    entropy: Math.round(entropy * 100) / 100,
    energy: Math.round(energy * 10000) / 10000,
    contrast: Math.round(glcmContrast * 100) / 100,
    homogeneity: Math.round(homogeneity * 100) / 100,
    meanLuminance: Math.round(mean * 100) / 100,
    stdLuminance: Math.round(std * 100) / 100,
    dynamicRange: maxVal - minVal,
  };
}
