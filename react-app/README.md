# ISRM Command Center

Live dashboard for the ISRM Digital Operations System — RISE Center, Saint Louis University.

## Deployment Guide

### Option 1: Vercel (Recommended)

1. **Create a GitHub repository**
   - Go to [github.com](https://github.com)
   - Click **New repository**
   - Name it `isrm-command-center`
   - Upload the contents of this folder

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click **Add New → Project**
   - Import your GitHub repository
   - Click **Deploy**

3. **Done!** You'll get a URL like: `isrm-command-center.vercel.app`

**To update:** Push changes to GitHub and Vercel auto-deploys.

---

### Option 2: GitHub Pages

1. **Push to GitHub**
   - Create repository named `isrm-command-center`
   - Upload all files from this folder
   - Make sure `dist/` folder is NOT uploaded (it's generated during build)

2. **Enable GitHub Pages**
   - Go to repository **Settings → Pages**
   - Source: **GitHub Actions**

3. **Workflow auto-deploys on push to main branch**

4. **Access at:** `https://yourusername.github.io/isrm-command-center/`

---

### Option 3: Netlify (Already working)

Drag and drop the `dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop)

---

## Configuration

Before deploying, update the API URL in `src/App.tsx`:

```typescript
const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```

Replace with your deployed Google Apps Script Web App URL.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The built files go to `dist/` folder.
