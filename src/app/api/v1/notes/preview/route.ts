import { withApiAuth } from "@/lib/api/handler";
import { fetchLinkPreview } from "@/lib/services/link-preview";

export const POST = withApiAuth(async (req) => {
  const { url } = await req.json();
  return fetchLinkPreview(String(url || ""));
});
