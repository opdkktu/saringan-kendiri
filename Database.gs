/**
 * Config.gs
 * Central configuration for the Saringan Kendiri backend.
 * Replace placeholder IDs/tokens before deploying, or better, store them
 * in Script Properties (File > Project properties > Script properties)
 * and read them via PropertiesService as shown below.
 */

const CONFIG = {
  // Google Sheet used as the database. Get the ID from the sheet's URL.
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('SHEET_ID') || 'REPLACE_WITH_SHEET_ID',
  SHEET_NAME: 'Submissions',

  // Root Google Drive folder where year/month subfolders are created.
  DRIVE_ROOT_FOLDER_ID: PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_FOLDER_ID') || 'REPLACE_WITH_FOLDER_ID',

  // Shared secret the frontend must send with every request.
  SHARED_TOKEN: PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || 'REPLACE_WITH_SHARED_TOKEN',

  // Allowed origins for CORS (GitHub Pages URL, plus localhost for testing).
  ALLOWED_ORIGINS: [
    'https://YOUR_GITHUB_USERNAME.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],

  DUPLICATE_WINDOW_MINUTES: 30,
  MAX_IMAGE_BYTES: 8 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

  // Rate limiting: max requests per IP-ish key per window.
  RATE_LIMIT_MAX_REQUESTS: 20,
  RATE_LIMIT_WINDOW_SECONDS: 60,

  ADMIN_TOKEN: PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN') || 'REPLACE_WITH_ADMIN_TOKEN',

  SHEET_COLUMNS: [
    'Timestamp', 'Submission ID', 'Name', 'IC', 'DOB', 'Age', 'Age Group', 'Gender',
    'Phone', 'Medical Condition', 'Image URL', 'OCR Raw Text', 'Systolic', 'Diastolic',
    'Pulse', 'Confidence', 'Interpretation', 'Status', 'Created By', 'Remarks'
  ]
};
