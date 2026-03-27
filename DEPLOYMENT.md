# OrgRise — Deployment Guide

## Environment Variables

All variables below must be set in every environment (Vercel dashboard for production, `.env.local` for local dev).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase pgbouncer URL (port 6543) — used at runtime |
| `DIRECT_URL` | ✅ | Supabase direct URL (port 5432) — used by `prisma db push` / migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (file upload, admin ops) |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key for AI report generation |
| `RESEND_API_KEY` | ✅ | Resend API key for email delivery |
| `FROM_EMAIL` | ✅ | Sender address (must be verified domain in Resend) |
| `CRON_SECRET` | ✅ | Random secret to authenticate the `/api/cron` endpoint |
| `NEXT_PUBLIC_APP_URL` | ✅ | Full URL of the deployed app, e.g. `https://orgrise.ai` |

---

## ONE — Vercel Deployment

### Prerequisites
- Node.js 18+
- Vercel account at vercel.com

### Steps

```bash
# 1. Install Vercel CLI (already done if you see it in PATH)
npm install -g vercel

# 2. Authenticate (opens browser)
vercel login

# 3. Link project to your Vercel account (run once from project root)
cd /Users/scott/orgpulse
vercel link

# 4. Set every environment variable listed above
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel env add RESEND_API_KEY production
vercel env add FROM_EMAIL production
vercel env add CRON_SECRET production
vercel env add NEXT_PUBLIC_APP_URL production

# 5. Deploy to production
vercel --prod
```

### Cron Job
`vercel.json` configures the daily cron to call `POST /api/cron` at 08:00 UTC, Monday–Friday.
The endpoint authenticates via the `Authorization: Bearer <CRON_SECRET>` header.
To change the schedule, edit the `schedule` field in `vercel.json` (standard cron syntax).

### After deployment
- Note your production URL (e.g. `https://orgrise.ai`)
- Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to match
- Run `vercel --prod` again after updating env vars

---

## TWO — Resend Email Setup

1. Sign up at [resend.com](https://resend.com)
2. Go to **Domains** → Add your domain (e.g. `orgrise.ai`)
3. Add the DNS records Resend shows to your DNS provider
4. Wait for verification (usually < 5 minutes)
5. Go to **API Keys** → Create a new key with "Sending access"
6. Copy the key and set it as `RESEND_API_KEY` in Vercel env vars
7. Set `FROM_EMAIL` to an address on your verified domain (e.g. `reports@orgrise.ai`)

Emails are sent:
- On every manual "Generate" click from the dashboard
- On every cron run
- They include the full report with a "Download PDF" link

---

## THREE — PWA (Progressive Web App)

The PWA is already configured. No additional steps required after deployment.

**What's included:**
- `/public/manifest.json` — app manifest (name, icons, theme color, start URL)
- `/public/sw.js` — service worker (network-first caching, offline fallback)
- `/public/icons/icon-192.png` and `icon-512.png` — app icons (indigo solid, replace with your brand art)
- `/app/icon.tsx` — Next.js edge route serving the 32×32 favicon
- `/app/apple-icon.tsx` — Next.js edge route serving the 180×180 Apple touch icon
- `app/layout.tsx` — injects manifest link, Apple meta tags, and SW registration script

**Installing on iPhone:**
1. Open the production URL in Safari
2. Tap the Share button → "Add to Home Screen"
3. The app installs with the OrgRise icon and opens without browser chrome

**Installing on Android:**
1. Open in Chrome
2. Tap the three-dot menu → "Add to Home screen"

**Replacing placeholder icons:**
The auto-generated icons are solid indigo squares. Replace them with real artwork:
1. Export a 512×512 PNG of your icon (safe zone: keep logo within inner 80%)
2. Use [realfavicongenerator.net](https://realfavicongenerator.net) to generate all sizes
3. Drop the files into `/public/icons/`
4. Update `/app/icon.tsx` and `/app/apple-icon.tsx` to match

---

## FOUR — Electron Desktop App

### Prerequisites
- macOS machine for building `.dmg` (required — Mac binaries can only be built on Mac)
- Windows machine or VM for building `.exe`
- Apple Developer account for code signing (required for Gatekeeper on macOS 10.15+)
- GitHub repository with releases enabled

### One-time setup

**1. Update the deployed URL in `electron/main.js`:**
```js
const APP_URL = "https://your-actual-vercel-url.vercel.app";
```

**2. Update the GitHub repo in `package.json` → `build.publish`:**
```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_ORG",
  "repo": "orgrise"
}
```

**3. Set up code signing (macOS):**
```bash
# Export your Developer ID Application certificate from Keychain as a .p12
# Then set these environment variables before building:
export CSC_LINK=/path/to/cert.p12
export CSC_KEY_PASSWORD=your_p12_password
export APPLE_ID=your@apple.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx  # App-specific password
export APPLE_TEAM_ID=XXXXXXXXXX
```

### Building installers

```bash
# Install dependencies (already done)
npm install

# Build Mac universal DMG (Intel + Apple Silicon)
npm run electron:build:mac
# Output: dist/OrgRise-1.0.0-universal.dmg

# Build Windows installer (run on Windows or with Wine)
npm run electron:build:win
# Output: dist/OrgRise-Setup-1.0.0.exe

# Build both (from Mac, Windows exe requires cross-compile config)
npm run electron:build:all
```

### Releasing a new version

1. Bump the version in `package.json`
2. Build the installers (see above)
3. Create a GitHub Release tagged `v{version}` (e.g. `v1.1.0`)
4. Upload the `.dmg` and `.exe` files as release assets
5. Update `app/download/page.tsx` if the GitHub org/repo name has changed

**Auto-update flow:**
- On launch, the app calls `autoUpdater.checkForUpdatesAndNotify()`
- It checks the GitHub Releases page for a newer version
- If found, downloads in the background and prompts the user to restart

---

## FIVE — Summary of All Files Created / Modified

| File | Purpose |
|---|---|
| `vercel.json` | Cron job schedule for daily summary |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Service worker |
| `public/icons/icon-192.png` | PWA icon (192px) |
| `public/icons/icon-512.png` | PWA icon (512px) |
| `app/icon.tsx` | Next.js edge favicon generator |
| `app/apple-icon.tsx` | Next.js edge Apple touch icon generator |
| `app/layout.tsx` | Updated with PWA meta tags + SW registration |
| `app/download/page.tsx` | Download page with OS detection |
| `electron/main.js` | Electron entry point, loads Vercel URL |
| `electron/preload.js` | Electron security preload |
| `package.json` | Updated with electron-builder config + scripts |
| `lib/email.ts` | Resend email delivery (already wired) |
| `DEPLOYMENT.md` | This file |

---

## Quick-start checklist

- [ ] Run `vercel login` in terminal
- [ ] Run `vercel link` in project root
- [ ] Set all env vars via `vercel env add ...`
- [ ] Run `vercel --prod`
- [ ] Verify your domain in Resend, add API key to Vercel env
- [ ] Update `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Update `electron/main.js` with production URL
- [ ] Update `package.json` build.publish with your GitHub org/repo
- [ ] Build installers: `npm run electron:build:mac` / `electron:build:win`
- [ ] Create GitHub Release, upload installers
- [ ] Replace placeholder icons in `/public/icons/` with real artwork
