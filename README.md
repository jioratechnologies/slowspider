# Slow Spider — app (PWA)

This folder is your organizer packaged as a **Progressive Web App**: the same calm, local,
no-login tool you've been using, but installable on your Mac, iPhone, iPad, or Android, able to
run offline, and structured so it can later be wrapped into **Play Store** and **App Store**
packages without a rewrite.

## What's in here

```
index.html               ← the app itself
manifest.webmanifest     ← app name, icons, colours, "install me" info
sw.js                    ← service worker (makes it work offline)
icons/                   ← app icons (home-screen, maskable, Apple touch)
README.md                ← this guide
```

You can still just double-click `index.html` to use it like before. The app features
(install button, offline) only switch on when it's opened from a **web address** (https),
because browsers require that for service workers. So the next step is to put this folder online.

---

## 1. Try it locally first (optional)

From inside this folder, run a tiny local web server and open the address it gives you:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in Chrome or Edge. You'll see an install icon appear in the
address bar, and the ⋯ menu will show **Install app**.

## 2. Put it online (free, ~10 minutes)

Any of these host static files for free and give you an `https://` link. Pick one:

- **Netlify Drop** — go to app.netlify.com/drop and drag this whole folder onto the page.
  You get a live URL instantly. Easiest option.
- **Cloudflare Pages** — create a project, upload the folder. Fast, free, custom domains.
- **GitHub Pages** — put these files in a repo, enable Pages in the repo settings.

Once it's live, open the URL on any device.

## 3. Install it on your devices

- **Mac / Windows (Chrome or Edge):** open the URL, click the install icon in the address bar
  (or ⋯ menu → *Install app*). It opens in its own window with a Dock/taskbar icon.
- **iPhone / iPad:** open the URL in **Safari**, tap **Share**, then **Add to Home Screen**.
- **Android:** open the URL in Chrome, tap the menu, then **Install app** / **Add to Home Screen**.

Your data stays on each device (same as now). Use **Backup & sync** in the ⋯ menu to keep a
copy in a cloud folder or move data between devices.

---

## 4. Later: turn it into a Play Store / App Store app

Because it's a proper PWA hosted at a URL, wrapping it for the stores is a packaging step, not a
rebuild. Two well-trodden routes:

- **PWABuilder** (pwabuilder.com) — paste your hosted URL and it generates ready-to-submit
  packages for **Android (Google Play)** and **iOS (App Store)**, plus Windows. This is the
  simplest path for both stores.
- **Bubblewrap** (Google's CLI) — for Android specifically, builds a Trusted Web Activity (TWA)
  that runs your PWA as a native-feeling Play Store app.

What you'll still need when you get there: an **Apple Developer account** ($99/year) to publish on
the App Store, and a **Google Play Developer account** ($25 one-time) for Play. The stores also
review submissions, so budget a little time for that.

Tip that keeps this easy: keep the app a set of static files served from a URL, and keep the data
format (the JSON you see in Backup & sync) stable. That's the seam where cross-device **sync** or a
backend can be added later without touching the rest of the app.

---

## Notes

- **Offline:** after the first visit, the app shell is cached, so it opens with no connection.
  Your tasks live in the browser's local storage on each device.
- **Updates:** when you change `index.html`, bump the `CACHE` name in `sw.js` (e.g. `organizer-v2`)
  so devices pick up the new version.
- **Privacy:** still fully self-contained — no accounts, no tracking, no data leaving the device
  except through the backup/sync options you choose.
