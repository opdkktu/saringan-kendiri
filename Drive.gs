/**
 * Database.gs
 * All Google Sheets read/write logic lives here, isolated from the
 * request-handling layer in API.gs.
 */

function getSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(CONFIG.SHEET_COLUMNS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Append a fully-validated screening record as a new row. */
function appendScreeningRow_(record) {
  const sheet = getSheet_();
  const interpretation = interpretBP_(record.systolic, record.diastolic);

  sheet.appendRow([
    nowTimestamp_(),
    record.submissionId,
    record.name,
    record.ic,
    record.dob || '',
    record.age || '',
    record.ageGroup || '',
    record.gender || '',
    record.phone,
    (record.conditions || []).join(', '),
    record.imageUrl,
    record.ocrRawText || '',
    record.systolic,
    record.diastolic,
    record.pulse,
    record.confidence || '',
    interpretation,
    'Received',
    'Patient Self-Service',
    ''
  ]);

  return { submissionId: record.submissionId, interpretation };
}

/** Check whether the given IC submitted within the duplicate window. */
function isDuplicateSubmission_(ic) {
  const rows = getAllRowsAsObjects_();
  const cutoff = new Date(Date.now() - CONFIG.DUPLICATE_WINDOW_MINUTES * 60 * 1000);
  return rows.some(r => r['IC'] === ic && new Date(r['Timestamp']) > cutoff);
}

/** Fetch all rows for a given IC + phone pair, sorted oldest to newest. */
function getHistoryForPatient_(ic, phone) {
  return getAllRowsAsObjects_()
    .filter(r => r['IC'] === ic && r['Phone'] === phone)
    .map(rowToHistoryEntry_)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/** Fetch all rows within a day range (0 = all time) for the admin dashboard. */
function getRecordsForAdmin_(rangeDays) {
  let rows = getAllRowsAsObjects_();
  if (rangeDays && Number(rangeDays) > 0) {
    const cutoff = new Date(Date.now() - Number(rangeDays) * 24 * 60 * 60 * 1000);
    rows = rows.filter(r => new Date(r['Timestamp']) > cutoff);
  }
  return rows.map(rowToAdminEntry_).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getAllRowsAsObjects_() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const [headers, ...rows] = values;
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function rowToHistoryEntry_(r) {
  return {
    timestamp: new Date(r['Timestamp']).toISOString(),
    systolic: Number(r['Systolic']),
    diastolic: Number(r['Diastolic']),
    pulse: Number(r['Pulse']),
    interpretation: r['Interpretation']
  };
}

function rowToAdminEntry_(r) {
  return {
    timestamp: new Date(r['Timestamp']).toISOString(),
    submissionId: r['Submission ID'],
    name: r['Name'],
    ic: r['IC'],
    age: r['Age'],
    gender: r['Gender'],
    systolic: Number(r['Systolic']),
    diastolic: Number(r['Diastolic']),
    pulse: Number(r['Pulse']),
    interpretation: r['Interpretation']
  };
}
