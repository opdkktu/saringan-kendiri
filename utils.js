// ==========================================================================
// loading.js — controls the beautiful step-by-step loading overlay.
// ==========================================================================

const STEP_MESSAGES = {
  prepare: 'Menyediakan imej...',
  optimise: 'Mengoptimumkan imej...',
  ocr: 'Menjalankan OCR...',
  extract: 'Mengekstrak nombor...',
  upload: 'Memuat naik...',
  save: 'Menyimpan rekod...',
  done: 'Selesai.'
};

const STEP_ORDER = ['prepare', 'optimise', 'ocr', 'extract', 'upload', 'save', 'done'];

let overlay, stepLabel, progressBar, stepsList;

function ensureRefs() {
  overlay = overlay || document.getElementById('loadingOverlay');
  stepLabel = stepLabel || document.getElementById('loadingStep');
  progressBar = progressBar || document.getElementById('loadingProgressBar');
  stepsList = stepsList || document.getElementById('loadingStepsList');
}

export function showLoading(firstStep = 'prepare') {
  ensureRefs();
  overlay.hidden = false;
  setStep(firstStep);
}

export function hideLoading() {
  ensureRefs();
  overlay.hidden = true;
}

/** Move the overlay to a given step key, updating progress bar + step list. */
export function setStep(stepKey) {
  ensureRefs();
  const index = STEP_ORDER.indexOf(stepKey);
  if (index === -1) return;

  stepLabel.textContent = STEP_MESSAGES[stepKey] || stepKey;
  progressBar.style.width = `${Math.round(((index + 1) / STEP_ORDER.length) * 100)}%`;

  [...stepsList.children].forEach((li, i) => {
    li.classList.toggle('is-done', i < index);
    li.classList.toggle('is-active', i === index);
  });
}
