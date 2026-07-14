/**
 * Utilities_.gs
 * Small shared helper functions used across the backend.
 * (Named Utilities_ to avoid clashing with Apps Script's built-in
 * global `Utilities` service.)
 */

/** Build a standard success JSON response. */
function jsonSuccess_(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Build a standard error JSON response. */
function jsonError_(message, code) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, message, code: code || 'ERROR' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Generate a submission ID: SK-YYYYMMDD-XXXX. */
function generateSubmissionId_() {
  const now = new Date();
  const stamp = Utilities.formatDate(now, 'GMT+8', 'yyyyMMdd');
  const rand = Utilities.getUuid().slice(0, 4).toUpperCase();
  return `SK-${stamp}-${rand}`;
}

/** Format a Date as an ISO-ish timestamp string for the sheet. */
function nowTimestamp_() {
  return Utilities.formatDate(new Date(), 'GMT+8', "yyyy-MM-dd'T'HH:mm:ss");
}

/** Log an event to the Apps Script logger with a consistent prefix. */
function logEvent_(label, payload) {
  console.log(`[SaringanKendiri] ${label}: ${JSON.stringify(payload)}`);
}

/** Safely parse JSON, returning null on failure instead of throwing. */
function safeParseJson_(text) {
  try { return JSON.parse(text); } catch (e) { return null; }
}
