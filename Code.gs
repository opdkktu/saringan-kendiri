/**
 * API.gs
 * HTTP entry points. Google Apps Script Web Apps only support doGet/doPost;
 * we route all actions through doPost with an `action` field in the JSON
 * body, and use a text/plain content-type on the frontend so no CORS
 * preflight (OPTIONS) request is triggered — Apps Script Web Apps cannot
 * respond to preflight requests.
 */

function doPost(e) {
  try {
    const request = safeParseJson_(e.postData.contents);
    if (!request || !request.action) {
      return jsonError_('Permintaan tidak sah.', 'BAD_REQUEST');
    }

    switch (request.action) {
      case 'uploadImage':      return handleUploadImage_(request);
      case 'submitScreening':  return handleSubmitScreening_(request);
      case 'checkDuplicate':   return handleCheckDuplicate_(request);
      case 'fetchHistory':     return handleFetchHistory_(request);
      case 'fetchAdminData':   return handleFetchAdminData_(request);
      default:
        return jsonError_('Tindakan tidak dikenali.', 'UNKNOWN_ACTION');
    }
  } catch (err) {
    logEvent_('doPost_error', { message: err.message, stack: err.stack });
    return jsonError_(err.message || 'Ralat pelayan.', err.code || 'SERVER_ERROR');
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: { status: 'Saringan Kendiri API is running.' } }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* --------------------------------------------------------------- handlers */

function handleUploadImage_(request) {
  assertAuthorized_(request);
  assertNotRateLimited_(request.submissionId || 'anon');

  const { base64Data, mimeType, submissionId } = request;
  if (!base64Data || !mimeType || !submissionId) {
    throw new AppError_('Data imej tidak lengkap.', 'BAD_REQUEST');
  }

  const result = saveImageToDrive_(base64Data, mimeType, submissionId);
  return jsonSuccess_(result);
}

function handleSubmitScreening_(request) {
  assertAuthorized_(request);
  const record = sanitizeObject_(request.record || {});
  assertNotRateLimited_(record.ic || 'anon');

  const validation = validateScreeningRecord_(record);
  if (!validation.valid) {
    throw new AppError_(validation.message, 'VALIDATION_ERROR');
  }

  const icCheck = validateIC_(record.ic);
  if (isDuplicateSubmission_(icCheck.formatted)) {
    throw new AppError_('Penyerahan pendua dikesan dalam tempoh yang ditetapkan.', 'DUPLICATE');
  }

  const result = appendScreeningRow_({ ...record, ic: icCheck.formatted, submissionId: record.submissionId || generateSubmissionId_() });
  return jsonSuccess_(result);
}

function handleCheckDuplicate_(request) {
  assertAuthorized_(request);
  const icCheck = validateIC_(request.ic);
  if (!icCheck.valid) throw new AppError_(icCheck.message, 'VALIDATION_ERROR');

  return jsonSuccess_({ isDuplicate: isDuplicateSubmission_(icCheck.formatted) });
}

function handleFetchHistory_(request) {
  assertAuthorized_(request);
  assertNotRateLimited_(request.ic || 'anon');

  const icCheck = validateIC_(request.ic);
  const phoneCheck = validatePhone_(request.phone);
  if (!icCheck.valid) throw new AppError_(icCheck.message, 'VALIDATION_ERROR');
  if (!phoneCheck.valid) throw new AppError_(phoneCheck.message, 'VALIDATION_ERROR');

  const history = getHistoryForPatient_(icCheck.formatted, phoneCheck.formatted);
  return jsonSuccess_(history);
}

function handleFetchAdminData_(request) {
  assertAdminAuthorized_(request);

  const records = getRecordsForAdmin_(request.range);
  const stats = computeAdminStats_(records);
  const dailyAverages = computeDailyAverages_(records);
  const ageDistribution = computeAgeDistribution_(records);
  const genderDistribution = computeGenderDistribution_(records);

  return jsonSuccess_({ records, stats, dailyAverages, ageDistribution, genderDistribution });
}

/* -------------------------------------------------------- stats helpers */

function computeAdminStats_(records) {
  const today = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd');
  const todayCount = records.filter(r => r.timestamp.startsWith(today)).length;
  const avg = (key) => records.length ? Math.round(records.reduce((s, r) => s + r[key], 0) / records.length) : 0;
  const highCount = records.filter(r => r.systolic >= 140 || r.diastolic >= 90).length;

  return {
    total: records.length,
    today: todayCount,
    avgSystolic: avg('systolic'),
    avgDiastolic: avg('diastolic'),
    avgPulse: avg('pulse'),
    highBpPercent: records.length ? Math.round((highCount / records.length) * 100) : 0
  };
}

function computeDailyAverages_(records) {
  const byDay = {};
  records.forEach(r => {
    const day = r.timestamp.slice(0, 10);
    byDay[day] = byDay[day] || { sysSum: 0, diaSum: 0, count: 0 };
    byDay[day].sysSum += r.systolic;
    byDay[day].diaSum += r.diastolic;
    byDay[day].count += 1;
  });
  return Object.keys(byDay).sort().map(day => ({
    date: day,
    avgSystolic: Math.round(byDay[day].sysSum / byDay[day].count),
    avgDiastolic: Math.round(byDay[day].diaSum / byDay[day].count)
  }));
}

function computeAgeDistribution_(records) {
  const groups = { '<18': 0, '18-39': 0, '40-59': 0, '60+': 0 };
  records.forEach(r => {
    const age = Number(r.age) || 0;
    if (age < 18) groups['<18']++;
    else if (age < 40) groups['18-39']++;
    else if (age < 60) groups['40-59']++;
    else groups['60+']++;
  });
  return groups;
}

function computeGenderDistribution_(records) {
  const groups = {};
  records.forEach(r => {
    const g = r.gender || 'Tidak diketahui';
    groups[g] = (groups[g] || 0) + 1;
  });
  return groups;
}
