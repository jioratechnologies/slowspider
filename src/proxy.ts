import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// CORS for the REST adapter only. These routes authenticate with a Bearer token, not
// cookies, so a wildcard origin doesn't open a CSRF hole — a cross-origin page can't read
// or attach the caller's token just by being allowed to make the request. Needed because
// browser-based clients (the mobile app's Expo web preview, or any other web consumer) run
// on a different origin than this server and browsers enforce CORS; native Android/iOS
// builds never hit this, since CORS is a browser-only mechanism.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-workspace-id",
};

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/v1")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }
    const response = await updateSession(request);
    for (const [k, v] of Object.entries(CORS_HEADERS)) response.headers.set(k, v);
    return response;
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
