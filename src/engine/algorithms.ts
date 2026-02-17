/**
 * Core image processing algorithms for PBR map generation.
 * All operations work on ImageData (RGBA pixel arrays).
 */

/** Convert RGBA ImageData to grayscale luminance array (0-255) */
export function toGrayscale(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    // ITU-R BT.709 luminance
    gray[i] = data[idx] * 0.2126 + data[idx + 1] * 0.7152 + data[idx + 2] * 0.0722;
  }
  return gray;
}

/** Convert grayscale float array back to ImageData */
export function grayscaleToImageData(
  gray: Float32Array,
  width: number,
  height: number
): ImageData {
  const imageData = new ImageData(width, height);
  const { data } = imageData;
  for (let i = 0; i < width * height; i++) {
    const v = Math.max(0, Math.min(255, Math.round(gray[i])));
    const idx = i * 4;
    data[idx] = v;
    data[idx + 1] = v;
    data[idx + 2] = v;
    data[idx + 3] = 255;
  }
  return imageData;
}

/** Gaussian blur on a float32 grayscale array */
export function gaussianBlur(
  input: Float32Array,
  width: number,
  height: number,
  sigma: number
): Float32Array {
  if (sigma <= 0) return new Float32Array(input);
  const radius = Math.ceil(sigma * 3);
  const kernel = createGaussianKernel(radius, sigma);
  // Separable: horizontal then vertical
  const temp = convolve1D(input, width, height, kernel, true);
  return convolve1D(temp, width, height, kernel, false);
}

function createGaussianKernel(radius: number, sigma: number): Float32Array {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  return kernel;
}

function convolve1D(
  input: Float32Array,
  width: number,
  height: number,
  kernel: Float32Array,
  horizontal: boolean
): Float32Array {
  const output = new Float32Array(input.length);
  const radius = (kernel.length - 1) / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        let sx: number, sy: number;
        if (horizontal) {
          sx = Math.max(0, Math.min(width - 1, x + k));
          sy = y;
        } else {
          sx = x;
          sy = Math.max(0, Math.min(height - 1, y + k));
        }
        sum += input[sy * width + sx] * kernel[k + radius];
      }
      output[y * width + x] = sum;
    }
  }
  return output;
}

/** Sobel operator - returns gradient X, gradient Y, and magnitude */
export function sobel(
  gray: Float32Array,
  width: number,
  height: number
): { gx: Float32Array; gy: Float32Array; magnitude: Float32Array } {
  const gx = new Float32Array(width * height);
  const gy = new Float32Array(width * height);
  const magnitude = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Sobel kernels
      const tl = gray[(y - 1) * width + (x - 1)];
      const tc = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];
      const ml = gray[y * width + (x - 1)];
      const mr = gray[y * width + (x + 1)];
      const bl = gray[(y + 1) * width + (x - 1)];
      const bc = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];

      gx[idx] = -tl - 2 * ml - bl + tr + 2 * mr + br;
      gy[idx] = -tl - 2 * tc - tr + bl + 2 * bc + br;
      magnitude[idx] = Math.sqrt(gx[idx] * gx[idx] + gy[idx] * gy[idx]);
    }
  }
  return { gx, gy, magnitude };
}

/** Canny edge detection */
export function cannyEdgeDetection(
  gray: Float32Array,
  width: number,
  height: number,
  lowThreshold: number = 50,
  highThreshold: number = 150,
  blurSigma: number = 1.4
): Float32Array {
  // 1. Blur
  const blurred = gaussianBlur(gray, width, height, blurSigma);
  // 2. Sobel gradients
  const { gx, gy, magnitude } = sobel(blurred, width, height);
  // 3. Non-maximum suppression
  const nms = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = Math.atan2(gy[idx], gx[idx]) * (180 / Math.PI);
      const absAngle = ((angle % 180) + 180) % 180;
      let n1 = 0, n2 = 0;

      if (absAngle < 22.5 || absAngle >= 157.5) {
        n1 = magnitude[y * width + (x - 1)];
        n2 = magnitude[y * width + (x + 1)];
      } else if (absAngle < 67.5) {
        n1 = magnitude[(y - 1) * width + (x + 1)];
        n2 = magnitude[(y + 1) * width + (x - 1)];
      } else if (absAngle < 112.5) {
        n1 = magnitude[(y - 1) * width + x];
        n2 = magnitude[(y + 1) * width + x];
      } else {
        n1 = magnitude[(y - 1) * width + (x - 1)];
        n2 = magnitude[(y + 1) * width + (x + 1)];
      }

      nms[idx] = magnitude[idx] >= n1 && magnitude[idx] >= n2 ? magnitude[idx] : 0;
    }
  }
  // 4. Hysteresis thresholding via BFS - trace edge chains from strong edges
  const output = new Float32Array(width * height);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // Seed BFS with all strong edge pixels
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (nms[idx] >= highThreshold) {
        output[idx] = 255;
        visited[idx] = 1;
        queue.push(idx);
      }
    }
  }

  // BFS: propagate through weak edges connected to strong edges
  let queueHead = 0;
  while (queueHead < queue.length) {
    const idx = queue[queueHead++];
    const cx = idx % width;
    const cy = Math.floor(idx / width);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 1 || nx >= width - 1 || ny < 1 || ny >= height - 1) continue;
        const nIdx = ny * width + nx;
        if (!visited[nIdx] && nms[nIdx] >= lowThreshold) {
          output[nIdx] = 255;
          visited[nIdx] = 1;
          queue.push(nIdx);
        }
      }
    }
  }
  return output;
}

/** Normalize a float array to 0-255 range */
export function normalize(arr: Float32Array): Float32Array {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i];
    if (arr[i] > max) max = arr[i];
  }
  const range = max - min || 1;
  const result = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i] = ((arr[i] - min) / range) * 255;
  }
  return result;
}

/** Apply levels adjustment (black point, white point, gamma) */
export function applyLevels(
  arr: Float32Array,
  blackPoint: number,
  whitePoint: number,
  gamma: number
): Float32Array {
  const result = new Float32Array(arr.length);
  // Guard: ensure whitePoint > blackPoint to prevent division by zero or inversion
  const safeWhite = Math.max(whitePoint, blackPoint + 1);
  const range = safeWhite - blackPoint;
  // Guard: gamma must be positive
  const safeGamma = Math.max(0.01, gamma);
  for (let i = 0; i < arr.length; i++) {
    let v = (arr[i] - blackPoint) / range;
    v = Math.max(0, Math.min(1, v));
    v = Math.pow(v, 1 / safeGamma);
    result[i] = v * 255;
  }
  return result;
}

/** Apply brightness and contrast */
export function applyBrightnessContrast(
  arr: Float32Array,
  brightness: number, // -100 to 100
  contrast: number // 0 to 200 (100 = no change)
): Float32Array {
  const result = new Float32Array(arr.length);
  const contrastFactor = contrast / 100;
  for (let i = 0; i < arr.length; i++) {
    let v = arr[i];
    v = (v - 128) * contrastFactor + 128 + brightness;
    result[i] = Math.max(0, Math.min(255, v));
  }
  return result;
}

/** Invert values */
export function invertArray(arr: Float32Array): Float32Array {
  const result = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i] = 255 - arr[i];
  }
  return result;
}

/** Local variance computation for roughness estimation */
export function localVariance(
  gray: Float32Array,
  width: number,
  height: number,
  windowSize: number = 7
): Float32Array {
  const result = new Float32Array(width * height);
  const half = Math.floor(windowSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, sumSq = 0, count = 0;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const sy = Math.max(0, Math.min(height - 1, y + dy));
          const sx = Math.max(0, Math.min(width - 1, x + dx));
          const v = gray[sy * width + sx];
          sum += v;
          sumSq += v * v;
          count++;
        }
      }
      const mean = sum / count;
      result[y * width + x] = Math.sqrt(sumSq / count - mean * mean);
    }
  }
  return result;
}

/** Laplacian operator (second derivative) */
export function laplacian(
  gray: Float32Array,
  width: number,
  height: number
): Float32Array {
  const result = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      result[idx] =
        -gray[(y - 1) * width + x] -
        gray[y * width + (x - 1)] +
        4 * gray[idx] -
        gray[y * width + (x + 1)] -
        gray[(y + 1) * width + x];
    }
  }
  return result;
}

/** Simple unsharp mask for sharpening */
export function sharpen(
  gray: Float32Array,
  width: number,
  height: number,
  amount: number // 0-100
): Float32Array {
  if (amount <= 0) return new Float32Array(gray);
  const blurred = gaussianBlur(gray, width, height, 1.5);
  const result = new Float32Array(gray.length);
  const strength = amount / 100;
  for (let i = 0; i < gray.length; i++) {
    const detail = gray[i] - blurred[i];
    result[i] = Math.max(0, Math.min(255, gray[i] + detail * strength * 2));
  }
  return result;
}

/** Get pixel value from ImageData at (x, y) */
export function getPixel(imageData: ImageData, x: number, y: number): [number, number, number, number] {
  const idx = (y * imageData.width + x) * 4;
  return [
    imageData.data[idx],
    imageData.data[idx + 1],
    imageData.data[idx + 2],
    imageData.data[idx + 3],
  ];
}

/** sRGB to Linear conversion */
export function srgbToLinear(v: number): number {
  v = v / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Linear to sRGB conversion */
export function linearToSrgb(v: number): number {
  v = Math.max(0, Math.min(1, v));
  return (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1.0 / 2.4) - 0.055) * 255;
}

/** Canvas helper: load image into ImageData */
export function imageToImageData(img: HTMLImageElement, maxSize?: number): ImageData {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  if (maxSize && (w > maxSize || h > maxSize)) {
    const scale = maxSize / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** ImageData to data URL */
export function imageDataToDataUrl(imageData: ImageData, format: string = "image/png"): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL(format);
}

/** ImageData to Blob */
export function imageDataToBlob(imageData: ImageData, format: string = "image/png"): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else resolve(new Blob([], { type: format }));
    }, format);
  });
}

/** Downscale ImageData by a factor using canvas (fast area-averaging) */
export function downscaleImageData(imageData: ImageData, factor: number): ImageData {
  if (factor <= 1) return imageData;
  const sw = imageData.width;
  const sh = imageData.height;
  const tw = Math.max(1, Math.round(sw / factor));
  const th = Math.max(1, Math.round(sh / factor));

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = sw;
  srcCanvas.height = sh;
  const srcCtx = srcCanvas.getContext("2d")!;
  srcCtx.putImageData(imageData, 0, 0);

  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = tw;
  dstCanvas.height = th;
  const dstCtx = dstCanvas.getContext("2d")!;
  dstCtx.drawImage(srcCanvas, 0, 0, tw, th);

  return dstCtx.getImageData(0, 0, tw, th);
}

/** Upscale ImageData to target dimensions using canvas bilinear interpolation */
export function upscaleImageData(imageData: ImageData, targetWidth: number, targetHeight: number): ImageData {
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  const srcCtx = srcCanvas.getContext("2d")!;
  srcCtx.putImageData(imageData, 0, 0);

  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = targetWidth;
  dstCanvas.height = targetHeight;
  const dstCtx = dstCanvas.getContext("2d")!;
  dstCtx.imageSmoothingEnabled = true;
  dstCtx.imageSmoothingQuality = "low";
  dstCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

  return dstCtx.getImageData(0, 0, targetWidth, targetHeight);
}
