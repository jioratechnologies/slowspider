import { withApi } from "@/lib/api/handler";
import { completeSignup } from "@/lib/services/account";
import { createDefaultWorkspace } from "@/lib/services/workspace";

export const POST = withApi(async (req) => {
  const { email, password } = await req.json();
  const result = await completeSignup(email, password);
  await createDefaultWorkspace(result.id);
  return { token: result.session.access_token, refreshToken: result.session.refresh_token, user: { id: result.id, email: result.email } };
});
