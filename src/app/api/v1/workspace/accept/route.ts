import { withApiAuth } from "@/lib/api/handler";
import { acceptInvite } from "@/lib/services/workspace";

export const POST = withApiAuth(async (req, { userId }) => {
  const { token: inviteToken } = await req.json();
  return acceptInvite(inviteToken, userId);
});
