// ==========================================================================
// history.js — patient self-service history lookup (IC + phone two-factor).
// ==========================================================================
import { validateAndParseIC, validatePhone, interpretBP } from './validation.js';
import { fetchHistory, ApiError } from './api.js';
import { renderTrendChart } from './charts.js';
import { showToast, storage, escapeHtml } from './utils.js';
import { CONFIG } from './config.js';

document.getElementById('year').textContent = new Date().getFullYear();

const themeToggle = document.getElementById('themeToggle');
document.body.dataset.theme = storage.get(CONFIG.THEME_STORAGE_KEY, 'light');
themeToggle.addEventListener('click', () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = next;
  storage.set(CONFIG.THEME_STORAGE_KEY, next);
});

const form = document.getElementById('lookupForm');
const icInput = document.getElementById('lookupIC');
const phoneInput = document.getElementById('lookupPhone');
const resultsSection = document.getElementById('resultsSection');
const emptyState = document.getElementById('emptyState');
const tbody = document.getElementById('historyTableBody');
let chartInstance = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const icResult = validateAndParseIC(icInput.value);
  document.getElementById('lookupICError').textContent = icResult.valid ? '' : icResult.message;

  const phoneResult = validatePhone(phoneInput.value);
  document.getElementById('lookupPhoneError').textContent = phoneResult.valid ? '' : phoneResult.message;

  if (!icResult.valid || !phoneResult.valid) return;

  try {
    const records = await fetchHistory(icResult.formatted, phoneResult.formatted);
    if (!records || records.length === 0) {
      resultsSection.hidden = true;
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;
    resultsSection.hidden = false;
    renderResults(records);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Gagal mendapatkan rekod. Sila cuba lagi.';
    showToast(message, 'error');
  }
});

function renderResults(records) {
  if (chartInstance) chartInstance.destroy();
  chartInstance = renderTrendChart(document.getElementById('trendChart'), records);

  tbody.innerHTML = records.map(r => {
    const interp = interpretBP(r.systolic, r.diastolic);
    return `<tr style="border-bottom:1px solid var(--glass-border)">
      <td style="padding:8px">${escapeHtml(r.timestamp.slice(0, 10))}</td>
      <td style="padding:8px">${escapeHtml(r.systolic)}</td>
      <td style="padding:8px">${escapeHtml(r.diastolic)}</td>
      <td style="padding:8px">${escapeHtml(r.pulse)}</td>
      <td style="padding:8px; color:var(${interp.color}); font-weight:700">${escapeHtml(interp.label)}</td>
    </tr>`;
  }).join('');
}
