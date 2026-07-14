/**
 * OCR.gs
 *
 * OCR itself (Tesseract.js) runs entirely client-side in the browser —
 * see js/ocr.js — because Apps Script has no native image-recognition
 * API and shipping images to a third-party OCR service would add cost,
 * latency, and a privacy concern for patient photos.
 *
 * This file exists as the documented extension point for a server-side
 * re-check, and provides a lightweight sanity re-validation of whatever
 * numbers the client already extracted, using the same range rules as
 * Validation.gs. It intentionally does NOT re-run OCR — it just refuses
 * to trust OCR confidence blindly.
 */

/**
 * Re-check that OCR-derived numbers are internally consistent before they
 * are persisted. Returns { plausible, reason }.
 */
function sanityCheckOcrReading_(systolic, diastolic, pulse, confidence) {
  const s = Number(systolic), d = Number(diastolic), p = Number(pulse), c = Number(confidence || 0);

  if (c && c < 40) {
    return { plausible: false, reason: 'Keyakinan OCR terlalu rendah untuk diterima tanpa semakan manual.' };
  }
  if (s - d < 10) {
    return { plausible: false, reason: 'Perbezaan sistolik-diastolik tidak munasabah secara fisiologi.' };
  }
  return { plausible: true, reason: '' };
}
