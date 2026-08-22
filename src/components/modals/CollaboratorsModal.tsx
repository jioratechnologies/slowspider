"use client";

import { useEffect, useState } from "react";
import { Crown, Mail, Shield, UserMinus, Users, X, Send, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { listCollaborators, inviteCollaborator, removeCollaborator, revokeCollaboratorInvite } from "@/lib/workspace-actions";
import type { MemberRow, InviteRow } from "@/lib/services/workspace";

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
  const [copiedToken, setCopiedToken] = useState<number | null>(null);
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
        className="max-w-[92vw] sm:max-w-120 gap-0 p-0 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16161a] shadow-2xl backdrop-blur-2xl text-zinc-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Users className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Workspace Collaborators
              </DialogTitle>
              <DialogDescription className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Manage members with access to this workspace
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Invite form for Owner */}
          {isOwner && (
            <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] p-3.5 space-y-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider font-mono text-zinc-500 dark:text-zinc-400 block">
                Invite new collaborator
              </span>
              <form onSubmit={invite} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="teammate@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-[13px] placeholder:text-zinc-400 focus:border-zinc-400 dark:focus:border-white/20"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={busy || !email.trim()}
                  className="h-9 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium px-4 text-[12.5px] shadow-xs shrink-0"
                >
                  <Send className="size-3.5 mr-1.5" /> Invite
                </Button>
              </form>
              {err && <p className="text-[12px] font-medium text-rose-500 dark:text-rose-400 pt-0.5">{err}</p>}
              {success && <p className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 pt-0.5">{success}</p>}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-sm text-zinc-400 animate-pulse">Loading collaborators…</div>
          ) : (
            <>
              {/* Members List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11.5px] font-semibold uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
                  <span>Members ({members.length})</span>
                  <span>Role</span>
                </div>

                <div className="space-y-1.5">
                  {members.map((m) => {
                    const isSelf = m.email === currentUserEmail;
                    return (
                      <div
                        key={m.userId}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.02] p-2.5 transition-colors hover:bg-zinc-100/60 dark:hover:bg-white/[0.04]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-[11px] shadow-2xs">
                            {getInitials(m.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {m.email || m.userId}
                              </span>
                              {isSelf && (
                                <span className="rounded-md bg-zinc-200/70 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                              Joined {new Date(m.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {m.role === "owner" ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              <Crown className="size-3" /> Owner
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                              <Shield className="size-3" /> Editor
                            </span>
                          )}

                          {isOwner && m.role !== "owner" && (
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                              title="Remove member"
                              onClick={() => remove(m.userId)}
                            >
                              <UserMinus className="size-3.5" />
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
                  <span className="text-[11.5px] font-semibold uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500 px-1 block">
                    Pending Invites ({invites.length})
                  </span>
                  <div className="space-y-1.5">
                    {invites.map((i) => (
                      <div
                        key={i.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-300 dark:border-white/10 bg-zinc-50/30 dark:bg-white/[0.01] p-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Mail className="size-4 shrink-0 text-amber-500" />
                          <div className="min-w-0">
                            <span className="text-[13px] text-zinc-700 dark:text-zinc-300 truncate block">
                              {i.email}
                            </span>
                            <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500">
                              Invited · Expires in 7 days
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-medium text-amber-600 dark:text-amber-400 font-mono">
                            Pending
                          </span>
                          {isOwner && (
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                              title="Revoke invite"
                              onClick={() => revoke(i.id)}
                            >
                              <X className="size-3.5" />
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

