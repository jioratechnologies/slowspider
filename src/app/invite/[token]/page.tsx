import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptWorkspaceInvite } from "@/lib/workspace-actions";
import SignIn from "@/components/auth/SignIn";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in — show the normal sign-in/signup screen. It refreshes the current route
  // on success (not a hardcoded redirect to "/"), so control lands right back here and the
  // invite gets accepted immediately after.
  if (!user) {
    return <SignIn />;
  }

  const result = await acceptWorkspaceInvite(token);
  if (!result.ok) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-5">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-(--sh-2)">
          <h1 className="mb-2 text-lg font-semibold [font-family:var(--serif)]">Couldn&apos;t join</h1>
          <p className="text-sm text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  redirect("/");
}
