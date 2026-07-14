// ==========================================================================
// admin.js — admin dashboard: stats, charts, search/filter, CSV export.
// Access is gated by the shared admin token (checked server-side too).
// ==========================================================================
import { CONFIG } from './config.js';
import { fetchAdminData, ApiError } from './api.js';
import { renderTrendSummaryChart, renderDistributionChart } from './charts.js';
import { interpretBP } from './validation.js';
import { showToast, storage, escapeHtml, debounce } from './utils.js';

document.getElementById('year').textContent = new Date().getFullYear();

document.body.dataset.theme = storage.get(CONFIG.THEME_STORAGE_KEY, 'light');
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = next;
  storage.set(CONFIG.THEME_STORAGE_KEY, next);
});

const tokenGate = document.getElementById('tokenGate');
const dashboard = document.getElementById('dashboard');
const adminTokenInput = document.getElementById('adminToken');

let allRecords = [];
let charts = {};

document.getElementById('adminLoginBtn').addEventListener('click', async () => {
  const token = adminTokenInput.value.trim();
  if (!token) { showToast('Sila masukkan token admin.', 'error'); return; }
  storage.set('sk_admin_token', token);
  await loadDashboard();
});

document.getElementById('rangeSelect').addEventListener('change', loadDashboard);
document.getElementById('searchInput').addEventListener('input', debounce(applyFilter, 200));
document.getElementById('exportBtn').addEventListener('click', exportCsv);
document.getElementById('printBtn').addEventListener('click', () => window.print());

async function loadDashboard() {
  const range = document.getElementById('rangeSelect').value;
  try {
    const data = await fetchAdminData(range);
    allRecords = data.records || [];
    renderStats(data.stats);
    renderCharts(data);
    applyFilter();
    tokenGate.hidden = true;
    dashboard.hidden = false;
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Gagal memuatkan data admin.';
    showToast(message, 'error');
  }
}

function renderStats(stats) {
  document.getElementById('statTotal').textContent = stats.total ?? 0;
  document.getElementById('statToday').textContent = stats.today ?? 0;
  document.getElementById('statAvgSys').textContent = stats.avgSystolic ? `${stats.avgSystolic} mmHg` : '—';
  document.getElementById('statHighPct').textContent = stats.highBpPercent != null ? `${stats.highBpPercent}%` : '—';
}

function renderCharts(data) {
  Object.values(charts).forEach(c => c.destroy());
  charts.trend = renderTrendSummaryChart(document.getElementById('chartTrend'), data.dailyAverages || []);
  charts.age = renderDistributionChart(
    document.getElementById('chartAge'),
    Object.keys(data.ageDistribution || {}),
    Object.values(data.ageDistribution || {}),
    ['#0F766E', '#6D5DD3', '#D9A404', '#EA7317', '#DC2626']
  );
  charts.gender = renderDistributionChart(
    document.getElementById('chartGender'),
    Object.keys(data.genderDistribution || {}),
    Object.values(data.genderDistribution || {}),
    ['#0F766E', '#6D5DD3']
  );
}

function applyFilter() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = !query ? allRecords : allRecords.filter(r =>
    r.name.toLowerCase().includes(query) ||
    r.ic.toLowerCase().includes(query) ||
    r.submissionId.toLowerCase().includes(query)
  );
  renderTable(filtered);
}

function renderTable(records) {
  const tbody = document.getElementById('recordsBody');
  tbody.innerHTML = records.map(r => {
    const interp = interpretBP(r.systolic, r.diastolic);
    return `<tr style="border-bottom:1px solid var(--glass-border)">
      <td style="padding:8px">${escapeHtml(r.timestamp.slice(0, 10))}</td>
      <td style="padding:8px">${escapeHtml(r.name)}</td>
      <td style="padding:8px">${escapeHtml(r.ic)}</td>
      <td style="padding:8px">${escapeHtml(r.systolic)}</td>
      <td style="padding:8px">${escapeHtml(r.diastolic)}</td>
      <td style="padding:8px">${escapeHtml(r.pulse)}</td>
      <td style="padding:8px; color:var(${interp.color}); font-weight:700">${escapeHtml(interp.label)}</td>
    </tr>`;
  }).join('');
}

function exportCsv() {
  const header = ['Tarikh', 'Nama', 'IC', 'Sistolik', 'Diastolik', 'Nadi', 'Tafsiran'];
  const rows = allRecords.map(r => {
    const interp = interpretBP(r.systolic, r.diastolic);
    return [r.timestamp.slice(0, 10), r.name, r.ic, r.systolic, r.diastolic, r.pulse, interp.label];
  });
  const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `saringan-kendiri-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Restore a saved token for convenience (still validated server-side each call).
const savedToken = storage.get('sk_admin_token');
if (savedToken) {
  adminTokenInput.value = savedToken;
}
