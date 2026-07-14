// ==========================================================================
// config.js — single source of truth for tunable values.
// Replace the placeholder API_URL and API_TOKEN before deploying.
// ==========================================================================

export const CONFIG = Object.freeze({
  // Your deployed Google Apps Script Web App URL (ends in /exec)
  API_URL: 'https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec',

  // Shared secret sent with every request; must match Config.gs SHARED_TOKEN
  API_TOKEN: 'REPLACE_WITH_SHARED_TOKEN',

  APP_NAME: 'Saringan Kendiri',
  APP_VERSION: '1.0.0',

  // Image handling
  MAX_IMAGE_MB: 8,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  COMPRESSION_QUALITY: 0.82,
  COMPRESSION_MAX_DIMENSION: 1600,

  // OCR
  OCR_LANG: 'eng',
  OCR_MIN_CONFIDENCE: 55,

  // Duplicate submission guard (minutes)
  DUPLICATE_WINDOW_MINUTES: 30,

  // BP validation ranges (mmHg / bpm)
  BP_RANGE: {
    systolic: { min: 60, max: 260 },
    diastolic: { min: 30, max: 180 },
    pulse: { min: 30, max: 220 }
  },

  // BP interpretation thresholds (American Heart Association style bands)
  BP_BANDS: [
    { key: 'crisis',   label: 'Krisis Hipertensi',        color: '--bp-crisis',   test: (s, d) => s >= 180 || d >= 120 },
    { key: 'stage2',   label: 'Hipertensi Tahap 2',        color: '--bp-stage2',   test: (s, d) => s >= 140 || d >= 90 },
    { key: 'stage1',   label: 'Hipertensi Tahap 1',        color: '--bp-stage1',   test: (s, d) => s >= 130 || d >= 80 },
    { key: 'elevated', label: 'Meningkat (Elevated)',      color: '--bp-elevated', test: (s, d) => s >= 120 && d < 80 },
    { key: 'normal',   label: 'Normal',                    color: '--bp-normal',   test: () => true }
  ],

  THEME_STORAGE_KEY: 'sk_theme',
  DRAFT_STORAGE_KEY: 'sk_draft'
});
