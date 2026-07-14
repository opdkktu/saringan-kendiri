// ==========================================================================
// charts.js — thin Chart.js wrappers for the history + admin dashboards.
// Chart.js is loaded via CDN <script> tag (window.Chart).
// ==========================================================================

const palette = {
  teal: '#0F766E',
  lavender: '#6D5DD3',
  amber: '#D9A404',
  red: '#DC2626',
  grid: 'rgba(74,97,103,0.12)'
};

export function renderTrendChart(canvas, records) {
  const labels = records.map(r => r.timestamp.slice(0, 10));
  return new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Sistolik', data: records.map(r => r.systolic), borderColor: palette.teal, backgroundColor: 'transparent', tension: .35, pointRadius: 3 },
        { label: 'Diastolik', data: records.map(r => r.diastolic), borderColor: palette.lavender, backgroundColor: 'transparent', tension: .35, pointRadius: 3 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { grid: { color: palette.grid } },
        y: { grid: { color: palette.grid }, suggestedMin: 40, suggestedMax: 200 }
      }
    }
  });
}

export function renderTrendSummaryChart(canvas, dailyAverages) {
  return new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: dailyAverages.map(d => d.date),
      datasets: [
        { label: 'Purata Sistolik', data: dailyAverages.map(d => d.avgSystolic), backgroundColor: palette.teal },
        { label: 'Purata Diastolik', data: dailyAverages.map(d => d.avgDiastolic), backgroundColor: palette.lavender }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

export function renderDistributionChart(canvas, labels, data, colors) {
  return new window.Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}
