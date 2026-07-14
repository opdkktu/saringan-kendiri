// ==========================================================================
// app.js — orchestrates the screening form: validation, OCR, upload, submit.
// ==========================================================================
import { CONFIG } from './config.js';
import { showToast, storage, attachRipple, generateSubmissionId, digitsOnly } from './utils.js';
import {
  validateFullName, validateAndParseIC, validatePhone, validateConditions,
  validateBPValues, interpretBP, isLikelyDuplicate
} from './validation.js';
import { showLoading, hideLoading, setStep } from './loading.js';
import { preprocessImage, runOCR, normalizeOcrText, extractBPNumbers } from './ocr.js';
import { initUploader, compressImage } from './upload.js';
import { uploadImage, submitScreening, checkDuplicate, ApiError } from './api.js';

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------------------------------------------------------------- theme */
const THEME_KEY = CONFIG.THEME_STORAGE_KEY;
const themeToggle = document.getElementById('themeToggle');
const savedTheme = storage.get(THEME_KEY, 'light');
document.body.dataset.theme = savedTheme;
themeToggle.addEventListener('click', () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = next;
  storage.set(THEME_KEY, next);
});

/* ---------------------------------------------------------- cursor glow */
const glow = document.getElementById('cursorGlow');
if (window.matchMedia('(hover: hover)').matches) {
  document.addEventListener('mousemove', (e) => {
    glow.style.opacity = '1';
    glow.style.left = `${e.clientX}px`;
    glow.style.top = `${e.clientY}px`;
  });
}

/* ------------------------------------------------------------- ripples */
document.querySelectorAll('.btn--ripple').forEach(attachRipple);

/* ---------------------------------------------------------- form refs */
const form = document.getElementById('bpForm');
const fullNameInput = document.getElementById('fullName');
const icInput = document.getElementById('icNumber');
const icInfo = document.getElementById('icInfo');
const phoneInput = document.getElementById('phoneNumber');
const conditionNone = document.getElementById('conditionNone');
const conditionBoxes = [...document.querySelectorAll('input[name="condition"]')];

const uploaderEl = document.getElementById('uploader');
const uploaderIdle = document.getElementById('uploaderIdle');
const uploaderPreview = document.getElementById('uploaderPreview');
const previewImage = document.getElementById('previewImage');
const photoInput = document.getElementById('photoInput');
const removeImageBtn = document.getElementById('removeImageBtn');

const ocrPanel = document.getElementById('ocrPanel');
const ocrConfidenceBadge = document.getElementById('ocrConfidenceBadge');
const ocrSystolic = document.getElementById('ocrSystolic');
const ocrDiastolic = document.getElementById('ocrDiastolic');
const ocrPulse = document.getElementById('ocrPulse');
const interpretationBox = document.getElementById('interpretationBox');
const interpretationDot = document.getElementById('interpretationDot');
const interpretationLabel = document.getElementById('interpretationLabel');
const interpretationText = document.getElementById('interpretationText');

const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');

let currentFile = null;
let currentBase64 = null;
let parsedIC = null;

/* ------------------------------------------------------- live validation */
fullNameInput.addEventListener('blur', () => {
  const { valid, message } = validateFullName(fullNameInput.value);
  setFieldState(fullNameInput, 'fullNameError', valid, message);
});

icInput.addEventListener('input', () => {
  icInput.value = digitsOnly(icInput.value).slice(0, 12);
});
icInput.addEventListener('blur', () => {
  const result = validateAndParseIC(icInput.value);
  setFieldState(icInput, 'icError', result.valid, result.message);
  if (result.valid) {
    parsedIC = result;
    icInfo.textContent = `${result.gender} · ${result.age} tahun · ${result.ageGroup}`;
  } else {
    parsedIC = null;
    icInfo.textContent = '';
  }
});

phoneInput.addEventListener('blur', () => {
  const { valid, message } = validatePhone(phoneInput.value);
  setFieldState(phoneInput, 'phoneError', valid, message);
});

conditionBoxes.forEach(box => {
  box.addEventListener('change', () => {
    if (box === conditionNone && box.checked) {
      conditionBoxes.forEach(b => { if (b !== conditionNone) b.checked = false; });
    } else if (box !== conditionNone && box.checked) {
      conditionNone.checked = false;
    }
    const selected = conditionBoxes.filter(b => b.checked).map(b => b.value);
    const { valid, message } = validateConditions(selected);
    document.getElementById('conditionError').textContent = valid ? '' : message;
  });
});

function setFieldState(input, errorId, valid, message) {
  input.classList.toggle('valid', valid);
  input.classList.toggle('invalid', !valid && input.value.length > 0);
  document.getElementById(errorId).textContent = (!valid && input.value.length > 0) ? message : '';
}

/* -------------------------------------------------------------- uploader */
initUploader({
  uploaderEl,
  inputEl: photoInput,
  onFile: handleNewPhoto
});

removeImageBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetPhoto();
});

async function handleNewPhoto(file) {
  currentFile = file;
  const { dataUrl, base64 } = await compressImage(file);
  currentBase64 = base64;
  previewImage.src = dataUrl;
  uploaderIdle.hidden = true;
  uploaderPreview.hidden = false;
  document.getElementById('photoError').textContent = '';

  await runOcrPipeline(dataUrl);
}

function resetPhoto() {
  currentFile = null;
  currentBase64 = null;
  photoInput.value = '';
  previewImage.src = '';
  uploaderIdle.hidden = false;
  uploaderPreview.hidden = true;
  ocrPanel.hidden = true;
  interpretationBox.hidden = true;
}

/* ------------------------------------------------------------- OCR flow */
async function runOcrPipeline(dataUrl) {
  ocrPanel.hidden = false;
  ocrConfidenceBadge.textContent = 'Keyakinan: memproses…';
  try {
    const canvas = await preprocessImage(dataUrl);
    const { text, confidence } = await runOCR(canvas, () => {});
    const normalized = normalizeOcrText(text);
    const numbers = extractBPNumbers(normalized);

    ocrSystolic.value = numbers.systolic ?? '';
    ocrDiastolic.value = numbers.diastolic ?? '';
    ocrPulse.value = numbers.pulse ?? '';
    ocrConfidenceBadge.textContent = `Keyakinan: ${Math.round(confidence)}%`;

    if (confidence < CONFIG.OCR_MIN_CONFIDENCE) {
      showToast('Keyakinan OCR rendah — sila semak nombor secara manual.', 'info');
    }
    updateInterpretationPreview();
  } catch (err) {
    ocrConfidenceBadge.textContent = 'Keyakinan: gagal';
    showToast('OCR gagal memproses imej. Sila masukkan nombor secara manual.', 'error');
  }
}

[ocrSystolic, ocrDiastolic, ocrPulse].forEach(el =>
  el.addEventListener('input', updateInterpretationPreview)
);

function updateInterpretationPreview() {
  const systolic = Number(ocrSystolic.value);
  const diastolic = Number(ocrDiastolic.value);
  if (!systolic || !diastolic) { interpretationBox.hidden = true; return; }

  const result = interpretBP(systolic, diastolic);
  interpretationBox.hidden = false;
  interpretationDot.style.background = `var(${result.color})`;
  interpretationLabel.textContent = result.label;
  interpretationLabel.style.color = `var(${result.color})`;
  interpretationText.textContent = result.message;
}

/* ------------------------------------------------------------ form submit */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nameCheck = validateFullName(fullNameInput.value);
  setFieldState(fullNameInput, 'fullNameError', nameCheck.valid, nameCheck.message);

  const icCheck = validateAndParseIC(icInput.value);
  setFieldState(icInput, 'icError', icCheck.valid, icCheck.message);
  if (icCheck.valid) parsedIC = icCheck;

  const phoneCheck = validatePhone(phoneInput.value);
  setFieldState(phoneInput, 'phoneError', phoneCheck.valid, phoneCheck.message);

  const selectedConditions = conditionBoxes.filter(b => b.checked).map(b => b.value);
  const conditionCheck = validateConditions(selectedConditions);
  document.getElementById('conditionError').textContent = conditionCheck.valid ? '' : conditionCheck.message;

  const photoError = document.getElementById('photoError');
  const hasPhoto = !!currentFile;
  photoError.textContent = hasPhoto ? '' : 'Sila muat naik gambar monitor tekanan darah.';

  const bpCheck = validateBPValues({
    systolic: Number(ocrSystolic.value),
    diastolic: Number(ocrDiastolic.value),
    pulse: Number(ocrPulse.value)
  });
  if (!bpCheck.valid) bpCheck.errors.forEach(msg => showToast(msg, 'error'));

  if (![nameCheck.valid, icCheck.valid, phoneCheck.valid, conditionCheck.valid, hasPhoto, bpCheck.valid].every(Boolean)) {
    showToast('Sila betulkan ralat pada borang sebelum menghantar.', 'error');
    return;
  }

  if (isLikelyDuplicate(icCheck.formatted, (k) => storage.get(k))) {
    showToast(`Anda baru sahaja menghantar saringan. Sila tunggu ${CONFIG.DUPLICATE_WINDOW_MINUTES} minit.`, 'error');
    return;
  }

  await handleSubmission({ nameCheck, icCheck, phoneCheck, selectedConditions });
});

async function handleSubmission({ nameCheck, icCheck, phoneCheck, selectedConditions }) {
  submitBtn.disabled = true;
  showLoading('prepare');

  try {
    setStep('optimise');
    const dup = await checkDuplicate(icCheck.formatted);
    if (dup?.isDuplicate) {
      hideLoading();
      showToast(`Rekod sedia ada dalam ${CONFIG.DUPLICATE_WINDOW_MINUTES} minit lepas. Sila cuba kemudian.`, 'error');
      submitBtn.disabled = false;
      return;
    }

    const submissionId = generateSubmissionId();

    setStep('upload');
    const uploadResult = await uploadImage(currentBase64, 'image/jpeg', submissionId);

    setStep('save');
    const systolic = Number(ocrSystolic.value);
    const diastolic = Number(ocrDiastolic.value);
    const pulse = Number(ocrPulse.value);
    const interpretation = interpretBP(systolic, diastolic);

    await submitScreening({
      submissionId,
      name: fullNameInput.value.trim(),
      ic: icCheck.formatted,
      dob: icCheck.dob.toISOString().slice(0, 10),
      age: icCheck.age,
      ageGroup: icCheck.ageGroup,
      gender: icCheck.gender,
      phone: phoneCheck.formatted,
      conditions: selectedConditions,
      imageUrl: uploadResult.imageUrl,
      systolic, diastolic, pulse,
      interpretationLabel: interpretation.label,
      interpretationKey: interpretation.key
    });

    storage.set(`sk_last_submit_${icCheck.formatted}`, Date.now());
    setStep('done');
    setTimeout(() => {
      hideLoading();
      showToast('Saringan berjaya dihantar! Terima kasih.', 'success');
      form.reset();
      resetPhoto();
      icInfo.textContent = '';
      submitBtn.disabled = false;
    }, 700);

  } catch (err) {
    hideLoading();
    submitBtn.disabled = false;
    const message = err instanceof ApiError ? err.message : 'Ralat tidak dijangka berlaku. Sila cuba lagi.';
    showToast(message, 'error');
  }
}

resetBtn.addEventListener('click', () => {
  form.reset();
  resetPhoto();
  icInfo.textContent = '';
  [fullNameInput, icInput, phoneInput].forEach(el => el.classList.remove('valid', 'invalid'));
});
