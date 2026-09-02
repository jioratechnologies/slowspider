"use client";

import { useEffect, useState } from "react";
import { Crown, Mail, Shield, UserMinus, Users, X, Send, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { listCollaborators, inviteCollaborator, removeCollaborator, revokeCollaboratorInvite } from "@/lib/workspace-actions";
import type { MemberRow, InviteRow } from "@/lib/workspace-actions";

export default function CollaboratorsModal({
  open,
  onClose,
  currentUserEmail,
}: {
  open: boolean;
  onClose: () => void;
  currentUserEmail: string;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const loading = open && !loadedOnce;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listCollaborators().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setMembers(res.members);
        setInvites(res.invites);
      } else {
        setErr(res.error);
      }
      setLoadedOnce(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const self = members.find((m) => m.email === currentUserEmail);
  const isOwner = self?.role === "owner";

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    setErr("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await inviteCollaborator(v);
      if (!res.ok) {
        setErr(res.error || "Something went wrong.");
      } else {
        setEmail("");
        setSuccess(`Invitation sent to ${v}`);
        const refreshed = await listCollaborators();
        if (refreshed.ok) setInvites(refreshed.invites);
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    await removeCollaborator(userId);
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  }

  async function revoke(inviteId: number) {
    await revokeCollaboratorInvite(inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }

  function getInitials(mail: string | null) {
    if (!mail) return "U";
    return mail.slice(0, 2).toUpperCase();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className="max-w-[92vw] sm:max-w-lg gap-0 p-0 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#18181c] shadow-2xl text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/30">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Workspace Collaborators
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
                Manage members with access to this workspace
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Invite form for Owner */}
          {isOwner && (
            <div className="rounded-xl border border-(line) bg-(panel-2) p-3.5 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-(muted) block">
                Invite new collaborator
              </span>
              <form onSubmit={invite} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="teammate@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8.5 rounded-lg border-(line) bg-(bg) text-[13px]"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={busy || !email.trim()}
                  className="h-8.5 rounded-lg bg-(ink) text-(bg) font-medium px-3 text-[12px] shrink-0 cursor-pointer"
                >
                  <Send className="size-3 mr-1.5" /> Invite
                </Button>
              </form>
              {err && <p className="text-[11.5px] text-rose-500 pt-0.5">{err}</p>}
              {success && <p className="text-[11.5px] text-emerald-500 pt-0.5">{success}</p>}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-xs text-(muted) animate-pulse font-mono">Loading collaborators…</div>
          ) : (
            <>
              {/* Members List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-(muted) px-1">
                  <span>Members ({members.length})</span>
                  <span>Role</span>
                </div>

                <div className="space-y-1.5">
                  {members.map((m) => {
                    const isSelf = m.email === currentUserEmail;
                    return (
                      <div
                        key={m.userId}
                        className="group flex items-center justify-between gap-3 rounded-lg border border-(line) bg-(bg) p-2.5 transition-colors hover:border-(line-strong)"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-(line) bg-(panel-2) text-(ink) font-mono font-medium text-[10.5px]">
                            {getInitials(m.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12.5px] font-medium text-(ink) truncate">
                                {m.email || m.userId}
                              </span>
                              {isSelf && (
                                <span className="rounded border border-(line) bg-(panel-2) px-1.5 py-0.2 text-[9.5px] font-mono text-(muted)">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[10.5px] text-(muted) font-mono">
                              Joined {new Date(m.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {m.role === "owner" ? (
                            <span className="inline-flex items-center gap-1 rounded border border-(line) bg-(panel-2) px-2 py-0.5 text-[10.5px] font-mono text-(ink)">
                              <Crown className="size-2.5" /> Owner
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded border border-(line) bg-(panel-2) px-2 py-0.5 text-[10.5px] font-mono text-(muted)">
                              <Shield className="size-2.5" /> Editor
                            </span>
                          )}

                          {isOwner && m.role !== "owner" && (
                            <button
                              type="button"
                              className="rounded p-1 text-(muted) opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all cursor-pointer"
                              title="Remove member"
                              onClick={() => remove(m.userId)}
                            >
                              <UserMinus className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending Invites */}
              {invites.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-(muted) px-1 block">
                    Pending Invites ({invites.length})
                  </span>
                  <div className="space-y-1.5">
                    {invites.map((i) => (
                      <div
                        key={i.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-(line) bg-(bg) p-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Mail className="size-3.5 shrink-0 text-(muted)" />
                          <div className="min-w-0">
                            <span className="text-[12.5px] text-(ink) truncate block">
                              {i.email}
                            </span>
                            <span className="text-[10px] text-(muted) font-mono">
                              Invited · Expires in 7 days
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded border border-(line) bg-(panel-2) px-1.5 py-0.2 text-[10px] text-(muted) font-mono">
                            Pending
                          </span>
                          {isOwner && (
                            <button
                              type="button"
                              className="rounded p-1 text-(muted) hover:text-rose-500 transition-colors cursor-pointer"
                              title="Revoke invite"
                              onClick={() => revoke(i.id)}
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
