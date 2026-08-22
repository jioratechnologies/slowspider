import { withApi } from "@/lib/api/handler";
import { verifySignupOtp } from "@/lib/services/account";

export const POST = withApi(async (req) => {
  const { email, code } = await req.json();
  await verifySignupOtp(email, code);
  return { verified: true };
});
