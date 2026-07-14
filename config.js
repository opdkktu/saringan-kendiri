// ==========================================================================
// api.js — thin client around the Google Apps Script Web App backend.
// All requests are POST with a JSON body; GAS Web Apps handle CORS via
// the doPost/doGet handlers themselves (see gas/API.gs).
// ==========================================================================
import { CONFIG } from './config.js';

async function callApi(action, payload = {}) {
  const body = JSON.stringify({
    action,
    token: CONFIG.API_TOKEN,
    ...payload
  });

  let response;
  try {
    response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight on GAS
      body
    });
  } catch (err) {
    throw new ApiError('Tiada sambungan rangkaian. Sila cuba lagi.', 'NETWORK_ERROR');
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new ApiError('Respons pelayan tidak sah.', 'BAD_RESPONSE');
  }

  if (!json.ok) {
    throw new ApiError(json.message || 'Ralat tidak diketahui berlaku.', json.code || 'API_ERROR');
  }
  return json.data;
}

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/** Upload a base64 image, returning { fileId, imageUrl }. */
export function uploadImage(base64Data, mimeType, submissionId) {
  return callApi('uploadImage', { base64Data, mimeType, submissionId });
}

/** Submit the full screening record to Google Sheets. */
export function submitScreening(record) {
  return callApi('submitScreening', { record });
}

/** Check server-side whether this IC recently submitted (defense in depth). */
export function checkDuplicate(icFormatted) {
  return callApi('checkDuplicate', { ic: icFormatted });
}

/** Retrieve a patient's past submissions by IC + phone (two-factor lookup). */
export function fetchHistory(icFormatted, phone) {
  return callApi('fetchHistory', { ic: icFormatted, phone });
}

/** Retrieve aggregate stats + records for the admin dashboard. */
export function fetchAdminData(range) {
  return callApi('fetchAdminData', { range });
}
