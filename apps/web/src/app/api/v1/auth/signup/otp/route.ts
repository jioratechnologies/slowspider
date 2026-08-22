import { withApi } from "@/lib/api/handler";
import { requestSignupOtp, normalizeEmail } from "@/lib/services/account";
import { enforceRateLimit } from "@/lib/rate-limit";

export const POST = withApi(async (req) => {
  const { email } = await req.json();
  await enforceRateLimit(`otp-req:${normalizeEmail(email)}`, 3, 600);
  return requestSignupOtp(email);
});
