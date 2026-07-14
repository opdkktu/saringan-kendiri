/**
 * Drive.gs
 * Handles uploading BP monitor photos to Google Drive, organized into
 * year/month subfolders, with basic duplicate-upload protection based
 * on a content hash.
 */

/**
 * Save a base64-encoded image to Drive under ROOT/YYYY/MM/, returning
 * { fileId, imageUrl }.
 */
function saveImageToDrive_(base64Data, mimeType, submissionId) {
  if (!CONFIG.ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new AppError_('Jenis fail imej tidak dibenarkan.', 'INVALID_MIME');
  }

  const bytes = Utilities.base64Decode(base64Data);
  if (bytes.length > CONFIG.MAX_IMAGE_BYTES) {
    throw new AppError_('Saiz imej melebihi had dibenarkan.', 'FILE_TOO_LARGE');
  }

  const contentHash = Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
  );

  const existing = findExistingUploadByHash_(contentHash);
  if (existing) {
    logEvent_('duplicate_upload_skipped', { submissionId });
    return existing;
  }

  const folder = getOrCreateMonthFolder_();
  const extension = mimeType === 'image/png' ? 'png' : (mimeType === 'image/webp' ? 'webp' : 'jpg');
  const blob = Utilities.newBlob(bytes, mimeType, `${submissionId}.${extension}`);

  const file = folder.createFile(blob);
  file.setDescription(`hash:${contentHash}`);

  // Share as "anyone with link can view" so the sheet's Image URL is usable
  // by admins without requiring individual Drive permissions.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const result = { fileId: file.getId(), imageUrl: `https://drive.google.com/uc?id=${file.getId()}` };
  cacheUploadHash_(contentHash, result);
  return result;
}

/** Get (or lazily create) the Drive folder for the current year/month. */
function getOrCreateMonthFolder_() {
  const now = new Date();
  const year = Utilities.formatDate(now, 'GMT+8', 'yyyy');
  const month = Utilities.formatDate(now, 'GMT+8', 'MM');

  const root = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_FOLDER_ID);
  const yearFolder = getOrCreateSubfolder_(root, year);
  return getOrCreateSubfolder_(yearFolder, month);
}

function getOrCreateSubfolder_(parent, name) {
  const iter = parent.getFoldersByName(name);
  if (iter.hasNext()) return iter.next();
  return parent.createFolder(name);
}

/** Cache a content-hash -> upload-result mapping for 24h to dedupe re-submits. */
function cacheUploadHash_(hash, result) {
  CacheService.getScriptCache().put(`upload_${hash}`, JSON.stringify(result), 21600);
}

function findExistingUploadByHash_(hash) {
  const cached = CacheService.getScriptCache().get(`upload_${hash}`);
  return cached ? safeParseJson_(cached) : null;
}
