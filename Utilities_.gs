/**
 * Security.gs
 * Shared-token auth, basic rate limiting (via CacheService), and
 * input sanitization helpers.
 */

/** Verify the shared token sent by the frontend. Throws on failure. */
function assertAuthorized_(request) {
  if (!request || request.token !== CONFIG.SHARED_TOKEN) {
    throw new AppError_('Token tidak sah.', 'UNAUTHORIZED');
  }
}

/** Verify the admin token for dashboard endpoints. Throws on failure. */
function assertAdminAuthorized_(request) {
  if (!request || request.token !== CONFIG.ADMIN_TOKEN) {
    throw new AppError_('Token admin tidak sah.', 'UNAUTHORIZED');
  }
}

/**
 * Very small rate limiter using CacheService, keyed by a caller-provided
 * identifier (e.g. IC number or a session id from the frontend, since
 * Apps Script Web Apps do not expose the caller's real IP address).
 */
function assertNotRateLimited_(key) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `rl_${key}`;
  const current = Number(cache.get(cacheKey) || '0');

  if (current >= CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    throw new AppError_('Terlalu banyak permintaan. Sila cuba sebentar lagi.', 'RATE_LIMITED');
  }
  cache.put(cacheKey, String(current + 1), CONFIG.RATE_LIMIT_WINDOW_SECONDS);
}

/** Strip HTML tags / control characters from a user-provided string. */
function sanitizeString_(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 500);
}

/** Recursively sanitize all string values in a plain object. */
function sanitizeObject_(obj) {
  if (Array.isArray(obj)) return obj.map(sanitizeObject_);
  if (obj && typeof obj === 'object') {
    const out = {};
    Object.keys(obj).forEach(k => { out[k] = sanitizeObject_(obj[k]); });
    return out;
  }
  if (typeof obj === 'string') return sanitizeString_(obj);
  return obj;
}

/** Custom application error carrying a machine-readable code. */
function AppError_(message, code) {
  const err = new Error(message);
  err.code = code || 'ERROR';
  return err;
}
