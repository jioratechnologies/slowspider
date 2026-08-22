import { withApi } from "@/lib/api/handler";
import { completeReset } from "@/lib/services/account";

export const POST = withApi(async (req) => {
  const { email, password } = await req.json();
  const result = await completeReset(email, password);
  return { token: result.session.access_token, refreshToken: result.session.refresh_token, user: { id: result.id, email: result.email } };
});
