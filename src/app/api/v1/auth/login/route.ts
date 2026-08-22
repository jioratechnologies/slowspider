import { withApi } from "@/lib/api/handler";
import { verifyCredentials, normalizeEmail } from "@/lib/services/account";
import { checkRateLimit } from "@/lib/rate-limit";

export const POST = withApi(async (req) => {
  const { email, password } = await req.json();
  if (!email || !password) throw new Error("Enter your email and password.");

  // Same Redis key as the web login path — one shared budget regardless of client.
  const withinLimit = await checkRateLimit(`login:${normalizeEmail(email)}`, 5, 300);
  if (!withinLimit) throw new Error("Too many attempts. Try again in a few minutes.");

  const result = await verifyCredentials(email, password);
  if (!result) throw new Error("Wrong email or password.");

  return { token: result.session.access_token, refreshToken: result.session.refresh_token, user: { id: result.id, email: result.email } };
});
