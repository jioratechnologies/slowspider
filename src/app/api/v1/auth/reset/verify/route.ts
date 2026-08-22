import { withApi } from "@/lib/api/handler";
import { verifyResetOtp } from "@/lib/services/account";

export const POST = withApi(async (req) => {
  const { email, code } = await req.json();
  await verifyResetOtp(email, code);
  return { verified: true };
});
