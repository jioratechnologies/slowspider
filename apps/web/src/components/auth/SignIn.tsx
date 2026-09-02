"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import {
  loginAction,
  requestSignupOtp,
  verifySignupOtp,
  completeSignup,
  requestResetOtp,
  verifyResetOtp,
  completeReset,
} from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spotlight } from "@/components/ui/aceternity/spotlight";
import { DotPattern } from "@/components/ui/aceternity/dot-pattern";

type Mode = "login" | "signup" | "forgot";
type Step = "email" | "otp" | "password";

const fadeStep = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [devCode, setDevCode] = useState("");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  function resetToMode(next: Mode) {
    setMode(next);
    setStep("email");
    setErr("");
    setDevCode("");
    setCode("");
    setPassword("");
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await loginAction(email, loginPassword);
      if (!res.ok) setErr(res.error || "Something went wrong.");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submitEmailStep(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = mode === "signup" ? await requestSignupOtp(email) : await requestResetOtp(email);
      if (!res.ok) {
        setErr(res.error || "Something went wrong.");
      } else {
        setDevCode(res.devCode || "");
        setStep("otp");
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitOtpStep(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = mode === "signup" ? await verifySignupOtp(email, code) : await verifyResetOtp(email, code);
      if (!res.ok) setErr(res.error || "Something went wrong.");
      else setStep("password");
    } finally {
      setBusy(false);
    }
  }

  async function submitPasswordStep(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const res = mode === "signup" ? await completeSignup(email, password) : await completeReset(email, password);
      if (!res.ok) {
        setErr(res.error || "Something went wrong.");
        if (res.error?.includes("log in")) resetToMode("login");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const stepKey = `${mode}:${step}`;

  return (
    <div className="relative flex min-h-dvh items-center justify-center p-5 bg-[var(--bg)]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-[390px] rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-9 py-10 shadow-[0_8px_44px_rgba(58,52,38,0.09)] dark:shadow-[0_8px_44px_rgba(0,0,0,0.55)]"
      >
        <div className="mb-7 flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel-2)]">
            <svg width="26" height="auto" viewBox="0 0 143 100" fill="none" role="img" aria-label="Slow Spider">
              <g stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--ink)]">
                <path d="M8 91 54 8 100 91" />
                <path d="M43 91 89 8 135 91" />
              </g>
              <circle cx="71.5" cy="87" r="11.5" className="fill-[var(--logo-dot)]" />
            </svg>
          </div>
          <div>
            <h1 className="m-0 text-[20px] font-medium [font-family:var(--serif)] tracking-tight text-[var(--ink)]">Slow Spider</h1>
            <div className="text-[12px] text-[var(--muted)]">A calm, single-screen organizer</div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === "login" && (
            <motion.form key="login" {...fadeStep} onSubmit={submitLogin}>
              <p className="mb-3.5 text-[13.5px] leading-relaxed text-muted-foreground">Log in with your email and password.</p>
              <div className="mb-3 space-y-1.5">
                <Label>Email</Label>
                <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="mt-3.5 w-full justify-center" disabled={busy}>
                {busy ? "Logging in…" : "Log in"}
              </Button>
              <div className="mt-2.5 flex justify-between">
                <Button type="button" variant="ghost" size="sm" onClick={() => resetToMode("signup")}>
                  Create an account
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => resetToMode("forgot")}>
                  Forgot password?
                </Button>
              </div>
            </motion.form>
          )}

          {mode !== "login" && step === "email" && (
            <motion.form key={stepKey} {...fadeStep} onSubmit={submitEmailStep}>
              <p className="mb-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
                {mode === "signup"
                  ? "Create an account — we'll email you a 6-digit code to verify it first."
                  : "Enter your account email — we'll send a 6-digit code to reset your password."}
              </p>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              </div>
              <Button type="submit" className="mt-3.5 w-full justify-center" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="mt-2 w-full justify-center" onClick={() => resetToMode("login")}>
                <ArrowLeft className="size-3.5" /> Back to log in
              </Button>
            </motion.form>
          )}

          {mode !== "login" && step === "otp" && (
            <motion.form key={stepKey} {...fadeStep} onSubmit={submitOtpStep}>
              <p className="mb-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
                Enter the 6-digit code we emailed to <b className="text-foreground">{email}</b>.
              </p>
              {devCode && (
                <div className="mb-2.5 border border-[var(--line)] px-2.5 py-1.5 text-xs text-[var(--ink)]">
                  Dev mode — code is <b>{devCode}</b> (nothing was actually emailed).
                </div>
              )}
              <div className="space-y-1.5">
                <Label>6-digit code</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                  className="tracking-[0.3em]"
                />
              </div>
              <div className="mt-3.5 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("email")}>
                  Back
                </Button>
                <Button type="submit" className="flex-1 justify-center" disabled={busy}>
                  {busy ? "Verifying…" : "Verify"}
                </Button>
              </div>
            </motion.form>
          )}

          {mode !== "login" && step === "password" && (
            <motion.form key={stepKey} {...fadeStep} onSubmit={submitPasswordStep}>
              <p className="mb-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
                {mode === "signup" ? "Email verified — set a password for your account." : "Set a new password."}
              </p>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              </div>
              <Button type="submit" className="mt-3.5 w-full justify-center" disabled={busy}>
                {busy ? "Saving…" : mode === "signup" ? "Create account" : "Save password"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {err && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 overflow-hidden text-[13px] font-medium text-[var(--ink)]"
            >
              {err}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
