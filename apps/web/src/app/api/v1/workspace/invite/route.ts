import { withApiAuth } from "@/lib/api/handler";
import { inviteMember } from "@/lib/services/workspace";

export const POST = withApiAuth(async (req, { userId, workspaceId }) => {
  const { email } = await req.json();
  await inviteMember(workspaceId, userId, email);
  return { invited: true };
});
