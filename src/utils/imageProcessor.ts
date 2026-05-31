import { type CropPoint } from '@/db/database';

// -------------------------------------------------------------
// Math & Matrices for Projective Homography
// -------------------------------------------------------------

/**
 * Solves a system of 8 linear equations using Gaussian elimination
 * to find the homography matrix coefficients that map points.
 */
function solveGaussian(A: number[][], B: number[]): number[] {
  const n = 8;
  for (let i = 0; i < n; i++) {
    // Search for maximum in this column
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }
    // Swap greatest row with current row
    for (let k = i; k < n; k++) {
      const tmp = A[maxRow][k];
      A[maxRow][k] = A[i][k];
      A[i][k] = tmp;
    }
    const tmp = B[maxRow];
    B[maxRow] = B[i];
    B[i] = tmp;

    // Zero rows below
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[i][i]) < 1e-10) continue;
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
      B[k] += c * B[i];
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = B[i];
    for (let k = i + 1; k < n; k++) {
      sum -= A[i][k] * x[k];
    }
    if (Math.abs(A[i][i]) > 1e-10) {
      x[i] = sum / A[i][i];
    } else {
      x[i] = 0;
    }
  }
  return x;
}

/**
 * Solves homography mapping for 4 points.
 * To do backward mapping, we solve from dst to src so we can map dst pixels -> src pixels.
 */
function getInverseHomography(
  src: CropPoint[], // TL, TR, BR, BL relative coordinates
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): number[] {
  // Convert relative coordinates to absolute source coordinates
  const s = src.map(pt => ({ x: pt.x * srcW, y: pt.y * srcH }));
  
  // Destination points (the bounding rectangle)
  const d = [
    { x: 0, y: 0 },         // TL
    { x: dstW, y: 0 },      // TR
    { x: dstW, y: dstH },    // BR
    { x: 0, y: dstH }       // BL
  ];

  // We want the INVERSE mapping (dst -> src)
  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x: u, y: v } = d[i]; // destination (input)
    const { x, y } = s[i];       // source (output)

    A.push([u, v, 1, 0, 0, 0, -x * u, -x * v]);
    A.push([0, 0, 0, u, v, 1, -y * u, -y * v]);
    B.push(x);
    B.push(y);
  }

  const h = solveGaussian(A, B);
  return [...h, 1]; // Return 3x3 homography matrix flat [h0...h8]
}

// Helper: load image safely into HTMLImageElement
export function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// -------------------------------------------------------------
// Perspective Warping Implementation
// -------------------------------------------------------------

/**
 * Performs a 4-point projective transform on an image Blob,
 * outputting a perspective-corrected image Blob.
 */
export async function warpPerspective(
  imageBlob: Blob,
  corners: CropPoint[],
  aspectRatioMethod: 'standard' | 'calculate' = 'calculate'
): Promise<Blob> {
  const img = await loadImageElement(imageBlob);
  const srcW = img.width;
  const srcH = img.height;

  // Calculate clean output dimensions based on average width and height of selected polygon
  let dstW = srcW;
  let dstH = srcH;

  if (aspectRatioMethod === 'calculate') {
    const pTL = { x: corners[0].x * srcW, y: corners[0].y * srcH };
    const pTR = { x: corners[1].x * srcW, y: corners[1].y * srcH };
    const pBR = { x: corners[2].x * srcW, y: corners[2].y * srcH };
    const pBL = { x: corners[3].x * srcW, y: corners[3].y * srcH };

    // Widths: top edge, bottom edge
    const wTop = Math.hypot(pTR.x - pTL.x, pTR.y - pTL.y);
    const wBottom = Math.hypot(pBR.x - pBL.x, pBR.y - pBL.y);
    const targetW = Math.round(Math.max(wTop, wBottom));

    // Heights: left edge, right edge
    const hLeft = Math.hypot(pBL.x - pTL.x, pBL.y - pTL.y);
    const hRight = Math.hypot(pBR.x - pTR.x, pBR.y - pTR.y);
    const targetH = Math.round(Math.max(hLeft, hRight));

    // Enforce reasonable bounds
    dstW = Math.max(100, Math.min(4000, targetW));
    dstH = Math.max(100, Math.min(4000, targetH));
  }

  // Create workspace canvas
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) throw new Error('Could not get src 2d context');
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
  const srcPixels = srcData.data;

  // Create output canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) throw new Error('Could not get dst 2d context');
  const dstData = dstCtx.createImageData(dstW, dstH);
  const dstPixels = dstData.data;

  // Compute inverse homography matrix H_inv (dst -> src)
  const H = getInverseHomography(corners, srcW, srcH, dstW, dstH);

  // Backward mapping with bilinear interpolation
  const h0 = H[0], h1 = H[1], h2 = H[2];
  const h3 = H[3], h4 = H[4], h5 = H[5];
  const h6 = H[6], h7 = H[7], h8 = H[8];

  for (let v = 0; v < dstH; v++) {
    for (let u = 0; u < dstW; u++) {
      // Homogeneous divide
      const w = h6 * u + h7 * v + h8;
      const x = (h0 * u + h1 * v + h2) / w;
      const y = (h3 * u + h4 * v + h5) / w;

      const dstIdx = (v * dstW + u) * 4;

      // Check bounds in source image
      if (x >= 0 && x < srcW - 1 && y >= 0 && y < srcH - 1) {
        // Bilinear interpolation
        const xFloor = Math.floor(x);
        const yFloor = Math.floor(y);
        const dx = x - xFloor;
        const dy = y - yFloor;

        const w00 = (1 - dx) * (1 - dy);
        const w10 = dx * (1 - dy);
        const w01 = (1 - dx) * dy;
        const w11 = dx * dy;

        const idx00 = (yFloor * srcW + xFloor) * 4;
        const idx10 = (yFloor * srcW + (xFloor + 1)) * 4;
        const idx01 = ((yFloor + 1) * srcW + xFloor) * 4;
        const idx11 = ((yFloor + 1) * srcW + (xFloor + 1)) * 4;

        // Red
        dstPixels[dstIdx] =
          w00 * srcPixels[idx00] +
          w10 * srcPixels[idx10] +
          w01 * srcPixels[idx01] +
          w11 * srcPixels[idx11];
        // Green
        dstPixels[dstIdx + 1] =
          w00 * srcPixels[idx00 + 1] +
          w10 * srcPixels[idx10 + 1] +
          w01 * srcPixels[idx01 + 1] +
          w11 * srcPixels[idx11 + 1];
        // Blue
        dstPixels[dstIdx + 2] =
          w00 * srcPixels[idx00 + 2] +
          w10 * srcPixels[idx10 + 2] +
          w01 * srcPixels[idx01 + 2] +
          w11 * srcPixels[idx11 + 2];
        // Alpha
        dstPixels[dstIdx + 3] = 255;
      } else {
        // Out of bounds: pad transparent or white (standard for pages is white background)
        dstPixels[dstIdx] = 255;
        dstPixels[dstIdx + 1] = 255;
        dstPixels[dstIdx + 2] = 255;
        dstPixels[dstIdx + 3] = 255;
      }
    }
  }

  dstCtx.putImageData(dstData, 0, 0);

  return new Promise<Blob>((resolve) => {
    dstCanvas.toBlob((blob) => {
      resolve(blob || imageBlob);
    }, 'image/jpeg', 0.92);
  });
}

// -------------------------------------------------------------
// Real-time Canvas Shaders & Filters
// -------------------------------------------------------------

export interface EnhancementFilters {
  type: 'original' | 'bw' | 'grayscale' | 'magic' | 'sharpen';
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
}

/**
 * Applies filters and enhancements on an image Blob,
 * outputting a final enhanced Blob.
 */
export async function applyImageEnhancements(
  imageBlob: Blob,
  filters: EnhancementFilters
): Promise<Blob> {
  if (
    filters.type === 'original' &&
    filters.brightness === 0 &&
    filters.contrast === 0
  ) {
    return imageBlob; // Short-circuit if original
  }

  const img = await loadImageElement(imageBlob);
  const w = img.width;
  const h = img.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Apply primary filters (grayscale, bw, magic, sharpen)
  if (filters.type === 'grayscale') {
    for (let i = 0; i < data.length; i += 4) {
      const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = g;
      data[i + 1] = g;
      data[i + 2] = g;
    }
  } else if (filters.type === 'bw') {
    // Elegant local adaptive thresholding simulation
    // We compute grayscale first, then boost contrast heavily, then apply threshold
    for (let i = 0; i < data.length; i += 4) {
      const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Push high contrast
      const factor = (255 + 240) / 255;
      let val = factor * (g - 128) + 128;
      // Soft thresholding
      val = val > 120 ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  } else if (filters.type === 'magic') {
    // Magic color: boosts contrast, increases brightness, enhances color saturation
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Brighten whites (offset highlights)
      r = Math.min(255, r * 1.15);
      g = Math.min(255, g * 1.15);
      b = Math.min(255, b * 1.15);

      // Boost contrast
      const factor = (255 + 45) / 255; // strong contrast boost
      r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
      g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
      b = Math.max(0, Math.min(255, factor * (b - 128) + 128));

      // Saturation boost
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = Math.max(0, Math.min(255, gray + (r - gray) * 1.35));
      g = Math.max(0, Math.min(255, gray + (g - gray) * 1.35));
      b = Math.max(0, Math.min(255, gray + (b - gray) * 1.35));

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  } else if (filters.type === 'sharpen') {
    // Custom 3x3 sharpen convolution matrix on separate canvas context
    const copy = ctx.getImageData(0, 0, w, h);
    const copyPixels = copy.data;
    const weights = [
       0, -1.2,  0,
      -1.2,  5.8, -1.2,
       0, -1.2,  0
    ];
    
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const dstIdx = (y * w + x) * 4;
        let rSum = 0, gSum = 0, bSum = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const srcIdx = ((y + ky) * w + (x + kx)) * 4;
            const wt = weights[(ky + 1) * 3 + (kx + 1)];
            rSum += copyPixels[srcIdx] * wt;
            gSum += copyPixels[srcIdx + 1] * wt;
            bSum += copyPixels[srcIdx + 2] * wt;
          }
        }

        data[iForCoordinates(x, y, w)] = Math.max(0, Math.min(255, rSum));
        data[iForCoordinates(x, y, w) + 1] = Math.max(0, Math.min(255, gSum));
        data[iForCoordinates(x, y, w) + 2] = Math.max(0, Math.min(255, bSum));
      }
    }
  }

  // Helper for coordinates mapping
  function iForCoordinates(x: number, y: number, width: number) {
    return (y * width + x) * 4;
  }

  // 2. Apply Brightness & Contrast
  if (filters.brightness !== 0 || filters.contrast !== 0) {
    const bOffset = filters.brightness * 2.55; // convert -100..100 to -255..255
    const cFactor = (255 + filters.contrast * 2.55) / 255;

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) { // RGB
        let val = data[i + c];
        // Apply brightness
        if (bOffset !== 0) val += bOffset;
        // Apply contrast
        if (filters.contrast !== 0) val = cFactor * (val - 128) + 128;
        
        data[i + c] = Math.max(0, Math.min(255, val));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || imageBlob);
    }, 'image/jpeg', 0.90);
  });
}

// -------------------------------------------------------------
// Auto-Edge-Detection Heuristics (Fallback & Helper)
// -------------------------------------------------------------

/**
 * Intelligent client-side bounding box estimator that detects margins.
 * It will try to look for high-contrast boundaries in the image,
 * falling back to a clean crop template if no sharp contrast fits.
 */
export async function detectDocumentEdges(imageBlob: Blob): Promise<CropPoint[]> {
  try {
    const img = await loadImageElement(imageBlob);
    const canvas = document.createElement('canvas');
    
    // Scale down image for fast heuristic processing
    const scale = Math.min(1.0, 300 / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return defaultCorners();
    
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const pixels = imgData.data;
    
    // Simple edge heuristic: search for high gradients along boundary sweeps
    // sweep left, right, top, bottom to find transition lines.
    const leftMargin = findTransitionEdge(pixels, w, h, 'horizontal', 1);
    const rightMargin = findTransitionEdge(pixels, w, h, 'horizontal', -1);
    const topMargin = findTransitionEdge(pixels, w, h, 'vertical', 1);
    const bottomMargin = findTransitionEdge(pixels, w, h, 'vertical', -1);
    
    // Set boundaries with safe fallback limits
    const l = Math.max(0.04, Math.min(0.25, leftMargin / w));
    const r = Math.max(0.75, Math.min(0.96, rightMargin / w));
    const t = Math.max(0.04, Math.min(0.25, topMargin / h));
    const b = Math.max(0.75, Math.min(0.96, bottomMargin / h));

    return [
      { x: l, y: t }, // TL
      { x: r, y: t }, // TR
      { x: r, y: b }, // BR
      { x: l, y: b }  // BL
    ];
  } catch (error) {
    console.error('Edge detection failed, utilizing default crop corners.', error);
    return defaultCorners();
  }
}

function defaultCorners(): CropPoint[] {
  return [
    { x: 0.05, y: 0.05 },
    { x: 0.95, y: 0.05 },
    { x: 0.95, y: 0.95 },
    { x: 0.05, y: 0.95 }
  ];
}

/**
 * Sweeps lines to find when gradients peak (sudden color shift).
 */
function findTransitionEdge(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  direction: 'horizontal' | 'vertical',
  sweepSign: 1 | -1
): number {
  const isHoriz = direction === 'horizontal';
  const limit = isHoriz ? w : h;
  const crossLimit = isHoriz ? h : w;
  
  const start = sweepSign === 1 ? 0 : limit - 1;
  const end = sweepSign === 1 ? Math.floor(limit * 0.35) : Math.floor(limit * 0.65);
  const step = sweepSign;
  
  let bestIdx = start;
  let maxGrad = 0;
  
  // Sweep to check gradients
  for (let i = start + step; i !== end; i += step) {
    let gradSum = 0;
    
    for (let c = 5; c < crossLimit - 5; c += 10) {
      const idx1 = isHoriz ? (c * w + i) * 4 : (i * w + c) * 4;
      const idx0 = isHoriz ? (c * w + (i - step)) * 4 : ((i - step) * w + c) * 4;
      
      const v1 = 0.299 * pixels[idx1] + 0.587 * pixels[idx1 + 1] + 0.114 * pixels[idx1 + 2];
      const v0 = 0.299 * pixels[idx0] + 0.587 * pixels[idx0 + 1] + 0.114 * pixels[idx0 + 2];
      
      gradSum += Math.abs(v1 - v0);
    }
    
    if (gradSum > maxGrad) {
      maxGrad = gradSum;
      bestIdx = i;
    }
  }
  
  return bestIdx;
}
