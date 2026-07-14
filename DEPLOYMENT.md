# Saringan Kendiri — Deployment Guide

## 1. Google Sheets (database)

1. Create a new Google Sheet — this will hold every submission.
2. Copy its ID from the URL: `docs.google.com/spreadsheets/d/**THIS_PART**/edit`.
3. You'll paste this into Script Properties in step 3 below. The sheet's
   header row and `Submissions` tab are created automatically the first
   time the backend runs (see `Database.gs → getSheet_()`).

## 2. Google Drive (image storage)

1. Create a folder in Google Drive, e.g. "Saringan Kendiri Uploads".
2. Copy its folder ID from the URL: `drive.google.com/drive/folders/**THIS_PART**`.
3. Year/month subfolders (e.g. `2026/07`) are created automatically per upload.

## 3. Google Apps Script backend

1. Go to [script.google.com](https://script.google.com) → New project.
2. Delete the default `Code.gs` content and create each file from the
   `gas/` folder in this project (`Code.gs`, `API.gs`, `Config.gs`,
   `Security.gs`, `Validation.gs`, `Database.gs`, `Drive.gs`, `OCR.gs`,
   `Utilities_.gs`), pasting in the matching content.
3. Project Settings (gear icon) → **Script properties** → add:
   - `SHEET_ID` = the Sheet ID from step 1
   - `DRIVE_ROOT_FOLDER_ID` = the folder ID from step 2
   - `SHARED_TOKEN` = a long random string (e.g. generate with `openssl rand -hex 24`)
   - `ADMIN_TOKEN` = a separate long random string for the admin dashboard
4. Run the `setup` function once from the editor (select it from the
   function dropdown, click Run) to confirm Sheet + Drive access. Approve
   the permission prompts.
5. **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the generated `/exec` URL — you'll need it in step 5 below.
7. Every time you edit the backend, create a **new version** under
   Manage deployments, or the live URL won't see your changes.

## 4. Frontend configuration

Edit `js/config.js`:

```js
API_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
API_TOKEN: 'THE_SAME_SHARED_TOKEN_YOU_SET_IN_SCRIPT_PROPERTIES',
```

Also update `gas/Config.gs → ALLOWED_ORIGINS` with your GitHub Pages URL.

## 5. GitHub Pages (frontend hosting)

1. Push this project folder to a GitHub repository.
2. Repository → **Settings → Pages** → Source: `main` branch, `/ (root)`.
3. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`.
4. Because service workers require HTTPS (or localhost), GitHub Pages
   satisfies this out of the box — no extra config needed for the PWA.

## 6. Tesseract.js (OCR)

No setup required — it's loaded from a CDN in `index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
```
The first OCR run per visitor downloads the language model (~10-15MB) and
caches it in the browser; subsequent scans are fast.

## 7. Cloudflare (optional CDN layer)

If you want a custom domain in front of GitHub Pages:
1. Add your domain to Cloudflare, point the CNAME at `YOUR_USERNAME.github.io`.
2. Enable "Always Use HTTPS" and Auto Minify (JS/CSS/HTML) under Speed settings.
3. This is purely optional — the app works fully on the default
   `github.io` domain.

## 8. PWA installation

- **Android/Chrome**: visit the site, tap the "Install app" banner or
  Menu → Install app.
- **iOS/Safari**: Share button → Add to Home Screen.
- **Desktop Chrome/Edge**: install icon in the address bar.

## 9. Admin dashboard access

Open `admin.html`, enter the `ADMIN_TOKEN` you set in Script Properties.
This token is required on every `fetchAdminData` request server-side —
losing it means generating a new one in Script Properties and sharing it
out-of-band with admins.

## 10. Testing checklist

- [ ] Submit a screening with a real IC number and a clear BP monitor photo
- [ ] Confirm the row appears in the Google Sheet with correct interpretation
- [ ] Confirm the image appears in the correct Drive year/month subfolder
- [ ] Submit a second time within 30 minutes with the same IC → should be blocked as duplicate
- [ ] Look up the submission on `history.html` using the same IC + phone
- [ ] Log into `admin.html` with the admin token and confirm stats/charts populate
- [ ] Export CSV from the admin dashboard and open it in a spreadsheet app
- [ ] Turn off Wi-Fi/data, reload the app → offline.html should appear for uncached routes
- [ ] Test on a small mobile screen (360px) and with a screen reader
- [ ] Toggle dark mode and confirm all text remains readable
