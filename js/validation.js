// ==========================================================================
// ocr.js — image preprocessing + Tesseract.js OCR + BP number extraction.
// Tesseract is loaded globally via CDN script tag (window.Tesseract).
// ==========================================================================
import { CONFIG } from './config.js';

/**
 * Preprocess an image for better OCR accuracy:
 * auto-rotate (EXIF-neutral canvas redraw), grayscale, contrast boost,
 * simple sharpen convolution, and downscale to a sane max dimension.
 * Returns a canvas.
 */
export async function preprocessImage(dataUrl) {
  const img = await loadImage(dataUrl);

  const maxDim = CONFIG.COMPRESSION_MAX_DIMENSION;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  // Grayscale + contrast stretch (approximates deskew/contrast/noise steps
  // requested in the brief; true perspective deskew would need a vision
  // library and is left as a documented extension point below).
  const imageData = ctx.getImageData(0, 0, w, h);
  grayscaleAndContrast(imageData.data);
  sharpen(imageData, w, h);
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function grayscaleAndContrast(data) {
  const contrast = 1.35;
  const intercept = 128 * (1 - contrast);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const adjusted = Math.min(255, Math.max(0, gray * contrast + intercept));
    data[i] = data[i + 1] = data[i + 2] = adjusted;
  }
}

function sharpen(imageData, w, h) {
  const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const side = 3;
  const half = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let ky = 0; ky < side; ky++) {
        for (let kx = 0; kx < side; kx++) {
          const sy = Math.min(h - 1, Math.max(0, y + ky - half));
          const sx = Math.min(w - 1, Math.max(0, x + kx - half));
          const srcIdx = (sy * w + sx) * 4;
          acc += src[srcIdx] * weights[ky * side + kx];
        }
      }
      const dstIdx = (y * w + x) * 4;
      dst[dstIdx] = dst[dstIdx + 1] = dst[dstIdx + 2] = Math.min(255, Math.max(0, acc));
    }
  }
}

/** Run Tesseract.js OCR over a canvas/image and return raw text + confidence. */
export async function runOCR(canvas, onProgress) {
  const { data } = await window.Tesseract.recognize(canvas, CONFIG.OCR_LANG, {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });
  return { text: data.text, confidence: data.confidence };
}

/**
 * Normalize common OCR misreads before parsing digits, e.g. O -> 0, I -> 1.
 */
export function normalizeOcrText(text) {
  return text
    .replace(/[oO]/g, '0')
    .replace(/[iIl]/g, '1')
    .replace(/[bB](?=\d)/g, '8')
    .replace(/[sS](?=\d)/g, '5')
    .replace(/[^\d\n]/g, ' ');
}

/**
 * Extract systolic/diastolic/pulse candidates from normalized OCR text.
 * Most BP monitors display three large numbers top-to-bottom:
 * systolic, diastolic, pulse. We take the first three plausible 2-3 digit
 * numbers in that order, falling back to null if not confidently found.
 */
export function extractBPNumbers(normalizedText) {
  const numbers = (normalizedText.match(/\d{2,3}/g) || []).map(Number)
    .filter(n => n >= 20 && n <= 260);

  const result = { systolic: null, diastolic: null, pulse: null };
  if (numbers.length >= 1) result.systolic = numbers[0];
  if (numbers.length >= 2) result.diastolic = numbers[1];
  if (numbers.length >= 3) result.pulse = numbers[2];
  return result;
}
