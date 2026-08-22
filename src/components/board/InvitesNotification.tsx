"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Building2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { listMyPendingInvites, acceptWorkspaceInvite, declineMyInvite } from "@/lib/workspace-actions";
import type { PendingInviteForUser } from "@/lib/services/workspace";

// GitHub-style invite bell — catches the case where someone signs up directly instead of
// clicking the invite link, so the invite doesn't just sit invisible until they think to
// check a Collaborators modal that has no reason to occur to them yet.
export default function InvitesNotification() {
  const router = useRouter();
  const [invites, setInvites] = useState<PendingInviteForUser[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    listMyPendingInvites().then((res) => {
      if (res.ok) setInvites(res.invites);
    });
  }, []);

  async function accept(invite: PendingInviteForUser) {
    setBusyId(invite.id);
    const res = await acceptWorkspaceInvite(invite.token);
    setBusyId(null);
    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setOpen(false);
      router.refresh();
    }
  }

  async function decline(inviteId: number) {
    setBusyId(inviteId);
    await declineMyInvite(inviteId);
    setBusyId(null);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground"
        title="Invitations"
      >
        <Bell className="size-4" />
        {invites.length > 0 && (
          <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {invites.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-75 p-0">
        <div className="border-b border-border px-3 py-2.5 text-sm font-semibold">Invitations</div>
        {!invites.length ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">No pending invitations.</div>
        ) : (
          <div className="flex flex-col gap-1 p-1.5">
            {invites.map((invite) => (
              <div key={invite.id} className="flex flex-col gap-1.5 rounded-lg p-2 hover:bg-accent">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{invite.workspaceName}</span>
                </div>
                <div className="pl-5.5 text-xs text-muted-foreground">
                  {invite.invitedByEmail ? `Invited by ${invite.invitedByEmail}` : "You were invited"}
                </div>
                <div className="flex gap-1.5 pl-5.5">
                  <Button size="xs" disabled={busyId === invite.id} onClick={() => accept(invite)}>
                    <Check className="size-3" /> Accept
                  </Button>
                  <Button size="xs" variant="outline" disabled={busyId === invite.id} onClick={() => decline(invite.id)}>
                    <X className="size-3" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
