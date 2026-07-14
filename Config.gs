/**
 * Code.gs
 * Project entry point / overview.
 *
 * Saringan Kendiri backend — Google Apps Script Web App.
 *
 * File map:
 *   Code.gs        - this file: overview + one-off setup helpers
 *   API.gs         - doGet/doPost HTTP routing + admin stats aggregation
 *   Config.gs      - all tunables (Sheet ID, Drive folder, tokens, limits)
 *   Security.gs    - token auth, rate limiting, input sanitization
 *   Validation.gs  - server-side re-validation of IC / phone / BP ranges
 *   Database.gs    - Google Sheets read/write layer
 *   Drive.gs       - Google Drive image upload + folder organization
 *   OCR.gs         - notes on the OCR architecture (OCR itself runs
 *                    client-side via Tesseract.js; see js/ocr.js)
 *   Utilities_.gs  - small shared helpers (JSON responses, IDs, logging)
 *
 * DEPLOYMENT (see also the full deployment guide in DEPLOYMENT.md):
 *   1. Create a Google Sheet, copy its ID into Script Properties as SHEET_ID.
 *   2. Create a Google Drive folder, copy its ID into Script Properties as
 *      DRIVE_ROOT_FOLDER_ID.
 *   3. Choose a strong random SHARED_TOKEN and ADMIN_TOKEN, store both in
 *      Script Properties.
 *   4. Deploy > New deployment > Web app. Execute as "Me", access "Anyone".
 *   5. Copy the /exec URL into the frontend's js/config.js CONFIG.API_URL.
 */

/** One-off setup helper: run manually from the Apps Script editor to
 *  initialize the Sheet header row and confirm Drive folder access. */
function setup() {
  const sheet = getSheet_();
  logEvent_('setup_sheet_ready', { rows: sheet.getLastRow() });

  const folder = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_FOLDER_ID);
  logEvent_('setup_drive_ready', { folderName: folder.getName() });
}

/** Manual smoke test: run from the editor to verify BP interpretation logic. */
function testInterpretation() {
  logEvent_('test_interpretation', {
    normal: interpretBP_(115, 75),
    elevated: interpretBP_(125, 78),
    stage1: interpretBP_(135, 85),
    stage2: interpretBP_(150, 95),
    crisis: interpretBP_(185, 122)
  });
}
