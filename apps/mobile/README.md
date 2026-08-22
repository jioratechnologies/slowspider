# Slow Spider — Android app

Expo / React Native client. It holds no business logic of its own: everything goes through
the same `/api/v1` REST adapter the web app sits beside, authenticated with a Supabase
access token (`Authorization: Bearer …`, plus `X-Workspace-Id`).

## Running it

```bash
cp .env.example .env          # point EXPO_PUBLIC_API_URL at your running Next.js server
npm install
npm run android
```

The Android emulator reaches your host machine at `10.0.2.2`, not `localhost`. On a
physical device use your machine's LAN IP.

## What's in it

- Sign in (token kept in `expo-secure-store`, restored on launch)
- Board grouped by cluster, Floating first; smart order = done last, starred first, then priority
- Star and complete straight from a row
- Task sheet: title, priority, deadline date + time
- Notes per task — text, photo/video (`expo-image-picker`), voice notes (`expo-audio`)
- Private vs shared toggle per note; private notes are enforced by Postgres RLS, not this client
- Per-user 10 GB storage meter

## Not here yet

Drag-and-drop reordering, cold store / bin management, and the calendar view are
desktop-side workflows and live in the web app.
