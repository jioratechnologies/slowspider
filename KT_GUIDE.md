# SlowSpider — Complete System Knowledge Transfer (KT) & Runbook

Welcome to the SlowSpider project! This document explains the complete architecture, how each component works, and exact copy-paste commands to start or rebuild anything from scratch.

---

## 1. System Architecture at a Glance

```
                      +-----------------------------+
                      |   Android App (Flutter)     |
                      |   or Next.js Web Frontend   |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               | (HTTP / REST API)                         | (WebSocket /v1/realtime)
               v                                           v
    +-------------------------------------------------------------+
    |                    NestJS Backend API                       |
    |                   (Listening on Port 3001)                  |
    |   - /v1/auth        - /v1/board        - /v1/tasks          |
    |   - /v1/clusters    - /v1/notes        - /v1/workspace      |
    +--------------+-------------------------------+--------------+
                   |                               |
                   v                               v
    +------------------------------+  +---------------------------+
    |  Cloud PostgreSQL Database   |  |   Cloud Upstash Redis     |
    |  (Supabase on AWS)           |  |   (Rate-limits & Caching) |
    +------------------------------+  +---------------------------+
```

---

## 2. Directory Structure

```
slowspider/
├── apps/
│   ├── android/             # Flutter Mobile & Tablet App (Android / iOS / Web)
│   │   ├── lib/             # Screens, state management (Riverpod), UI widgets
│   │   ├── build_apk.ps1    # Automated 1-click script to build release APK
│   │   └── setup_android_sdk.ps1 # Sets up Android SDK & CMake automatically
│   ├── backend/             # NestJS REST & WebSocket API server (Port 3001)
│   │   ├── src/             # Controllers, Services, Realtime Gateway
│   │   └── .env             # Database & Redis credentials
│   └── web/                 # Next.js Web Frontend (Port 3000)
├── infra/
│   ├── kong/                # Kong API Gateway configuration (Port 8000)
│   └── nats/                # NATS messaging configuration
├── slowspider-release.apk   # Generated Android Release APK (53.9 MB)
├── cloudflared.exe          # Cloudflare tunnel binary for instant public HTTPS
└── docker-compose.yml       # Multi-container Docker configuration
```

---

## 3. How to Start Everything From Scratch (Step-by-Step)

### Step 1: Start the Backend Services

You have **two ways** to run the backend:

#### Way A: Using Docker (Recommended — starts Kong Gateway, NATS, and Backend together)
```powershell
cd d:\jioratech\slowspider
docker compose up -d
```
> - **Main Gateway Port**: `8000` (Kong forwards traffic to backend + NATS realtime)
> - **Local Access**: `http://localhost:8000` (or LAN: `http://192.168.1.5:8000`)

#### Way B: Direct Node.js (Without Docker)
```powershell
cd d:\jioratech\slowspider\apps\backend
npx tsc -p tsconfig.json
node dist/main.js
```
> - **Direct Backend Port**: `3001`
> - **Local Access**: `http://localhost:3001` (or LAN: `http://192.168.1.5:3001`)

---

### Step 2: Make it Publicly Accessible (Choose Your Tunnel Option)

To connect your phone from mobile cellular data (4G/5G) or external Wi-Fi, open a new PowerShell terminal and choose **Option 1** or **Option 2**:

#### Option 1: Custom Short Domain (`.loca.lt`)
Gives you a clean, memorable custom URL:

- **If using Docker (Kong Port 8000)**:
  ```powershell
  npx localtunnel --port 8000 --subdomain slowspider-api
  ```
- **If running directly with Node (Port 3001)**:
  ```powershell
  npx localtunnel --port 3001 --subdomain slowspider-api
  ```
  
> 🌐 **Public URL**: `https://slowspider-api.loca.lt`

---

#### Option 2: Default Cloudflare Tunnel (`.trycloudflare.com`)
Zero-config, high-speed Cloudflare edge network (auto-generates a random URL):

- **If using Docker (Kong Port 8000)**:
  ```powershell
  cd d:\jioratech\slowspider
  .\cloudflared.exe tunnel --url http://localhost:8000
  ```
- **If running directly with Node (Port 3001)**:
  ```powershell
  cd d:\jioratech\slowspider
  .\cloudflared.exe tunnel --url http://localhost:3001
  ```
> 🌐 **Public URL**: `https://xxxx-xxxx-xxxx.trycloudflare.com` (displayed in terminal)

---

### Step 3: Connect and Use the Android App

1. Install **`slowspider-release.apk`** on your Android phone or emulator.
2. On the **Sign In** screen:
   - Tap **Developer Options** (expands the settings panel).
   - In **Custom API URL**, paste your URL:
     - **Custom Short Domain**: `https://slowspider-api.loca.lt`
     - **Cloudflare Tunnel**: `https://xxxx.trycloudflare.com`
     - **Local Wi-Fi (Docker)**: `http://192.168.1.5:8000`
     - **Local Wi-Fi (Direct Node)**: `http://192.168.1.5:3001`
   - Tap **Test Ping** (shows `● Connected`).
3. Enter your email (e.g. `user@slowspider.dev`).
4. Enter the Dev OTP code: **`123456`**.
5. You are logged in!

---

### Step 4 (Optional): Run the Next.js Web App
If you want to run the web frontend in your browser:
```powershell
cd d:\jioratech\slowspider\apps\web
npm run dev
```
> Open `http://localhost:3000` in Chrome/Edge.

---

## 4. How to Rebuild the Android APK in the Future

Whenever you make Dart/Flutter changes in `apps/android`:

1. Open PowerShell:
```powershell
cd d:\jioratech\slowspider\apps\android
powershell -ExecutionPolicy Bypass -File .\build_apk.ps1
```
2. The compiled file will be saved at:
   - `d:\jioratech\slowspider\apps\android\build\app\outputs\flutter-apk\app-release.apk`
   - Automatically copied to: `d:\jioratech\slowspider\slowspider-release.apk`

---

## 5. How to Run the Flutter App in Web Browser

You can run the exact same Flutter app inside Google Chrome / Edge web browser:

### A. Run in Development Mode (Live Hot-Reload)
```powershell
cd d:\jioratech\slowspider\apps\android
flutter run -d chrome --web-port 8080
```
> This opens Chrome with the Flutter app running on `http://localhost:8080`.

### B. Build Production Flutter Web App
```powershell
cd d:\jioratech\slowspider\apps\android
flutter build web --release
```
> The optimized web bundle is generated at `d:\jioratech\slowspider\apps\android\build\web`.

---

## 6. Summary Cheatsheet

| Task | With Docker (Kong) | Direct Node.js (Standalone) |
| :--- | :--- | :--- |
| **Start Backend** | `docker compose up -d` | `cd apps/backend; npx tsc; node dist/main.js` |
| **Port** | `8000` | `3001` |
| **Short Custom Domain** | `npx localtunnel --port 8000 --subdomain slowspider-api` | `npx localtunnel --port 3001 --subdomain slowspider-api` |
| **Cloudflare Tunnel** | `.\cloudflared.exe tunnel --url http://localhost:8000` | `.\cloudflared.exe tunnel --url http://localhost:3001` |
| **Local Wi-Fi IP** | `http://192.168.1.5:8000` | `http://192.168.1.5:3001` |
| **Dev Login OTP** | `123456` | `123456` |
| **Build Android APK** | `cd apps/android; .\build_apk.ps1` | `cd apps/android; .\build_apk.ps1` |
| **Run Flutter in Web** | `cd apps/android; flutter run -d chrome` | `cd apps/android; flutter run -d chrome` |
| **Run Next.js Web App** | `cd apps/web; npm run dev` | `cd apps/web; npm run dev` |
