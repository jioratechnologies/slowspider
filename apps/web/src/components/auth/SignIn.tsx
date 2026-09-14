"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Layers,
  Clock3,
  Star,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
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
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
};

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl border border-(line) bg-(panel) shadow-[var(--sh-1)]"
      style={{ width: size, height: size, borderRadius: 12 }}
    >
      <svg width={size * 0.68} height="auto" viewBox="0 0 143 100" fill="none" role="img" aria-label="Slow Spider">
        <g stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" className="text-(ink)">
          <path d="M8 91 54 8 100 91" />
          <path d="M43 91 89 8 135 91" />
        </g>
        <circle cx="71.5" cy="87" r="11.5" className="fill-(logo-dot)" />
      </svg>
    </div>
  );
}

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
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

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
  const isMultiStep = mode !== "login";
  const stepIndex = step === "email" ? 0 : step === "otp" ? 1 : 2;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-(bg)">
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0">
        <Spotlight className="opacity-[0.55]" />
        <DotPattern className="opacity-[0.28]" />
      </div>
      {/* subtle vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 600px at 18% 18%, color-mix(in srgb, var(--panel-2) 70%, transparent) 0%, transparent 60%), radial-gradient(900px 700px at 88% 88%, color-mix(in srgb, var(--accent-soft) 100%, transparent) 0%, transparent 62%)",
        }}
      />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1140px] grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        {/* ---- Left: brand / calm preview ---- */}
        <div className="relative hidden flex-col justify-between border-r border-(line) bg-(panel) px-10 py-10 xl:px-12 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark size={44} />
              <div>
                <div className="font-serif text-[17px] font-medium leading-none tracking-tight text-(ink)">Slow Spider</div>
                <div className="mt-1 text-[12px] tracking-wide text-(muted)">A calm, single-screen organizer</div>
              </div>
            </div>

            <h1 className="mt-10 max-w-[16ch] font-serif text-[42px] font-[380] leading-[0.94] tracking-[-0.025em] text-(ink)">
              A calmer place
              <br />
              <span className="font-[300] italic text-(muted)">to hold</span> your day.
            </h1>
            <p className="mt-4 max-w-[38ch] text-[14.5px] leading-relaxed text-(muted)">
              One board for tasks, clusters, and deadlines — warm paper, soft graphite, no noise. Everything in sight,
              nothing shouting.
            </p>

            <ul className="mt-8 grid gap-3">
              {[
                { icon: Layers, title: "Clusters, not chaos", desc: "Group work the way your mind does." },
                { icon: Star, title: "Priorities that stay quiet", desc: "Star what matters, mute the rest." },
                { icon: Clock3, title: "Deadlines, gently surfaced", desc: "Overdue and soon — nothing else flashes." },
              ].map((f) => (
                <li key={f.title} className="flex gap-3 rounded-2xl border border-(line) bg-(bg) px-3.5 py-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-(line) bg-(bg) text-(ink)">
                    <f.icon className="size-3.5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium leading-none text-(ink)">{f.title}</span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-(muted)">{f.desc}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* mock board preview — pure CSS, no images */}
            <div className="relative mt-8 overflow-hidden rounded-[18px] border border-(line) bg-(panel) p-4 shadow-[var(--sh-2)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-(logo-dot)" />
                  <span className="text-[11px] font-medium tracking-widest text-(ink3) uppercase">Today · 3 clusters</span>
                </div>
                <span className="rounded-full border border-(line) bg-(bg) px-2 py-0.5 text-[10px] tracking-wide text-(muted)">Single screen</span>
              </div>
              <div className="mt-3.5 grid grid-cols-[1.15fr_0.85fr] gap-3">
                <div className="rounded-xl border border-(line) bg-(bg) p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#C9A86A]" />
                    <span className="text-[11px] font-medium tracking-widest text-(ink3) uppercase">Research</span>
                  </div>
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-(line) bg-(panel) px-2.5 py-2">
                      <span className="size-1.5 rounded-full bg-(ink)" />
                      <span className="h-2 w-24 rounded-full bg-(ink) opacity-80" />
                    </div>
                    <div className="h-2 w-full rounded-full bg-(line-strong)" />
                    <div className="h-2 w-3/5 rounded-full bg-(line-strong)" />
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-(ink3)">
                    <Clock3 className="size-3" />
                    Due tomorrow
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-(line) bg-(panel-2) p-3">
                    <div className="text-[11px] font-medium tracking-widest text-(ink3) uppercase">Writing</div>
                    <div className="mt-2 space-y-1.5">
                      <div className="h-2 rounded-full bg-(line-strong)" />
                      <div className="h-2 w-4/5 rounded-full bg-(line-strong)" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-dashed border-(line-strong) bg-(bg) px-3 py-3 text-center">
                    <span className="text-[12px] text-(ink3)">Drop to organize</span>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-6 -bottom-8 h-28 w-28 rounded-full bg-(logo-dot)/15 blur-2xl" />
            </div>
          </div>

          <div className="pt-8">
            <div className="flex items-center gap-2 text-[11px] tracking-wide text-(ink3)">
              <ShieldCheck className="size-3.5" />
              Private by default · Encrypted at rest
            </div>
            <div className="mt-3 text-[11px] leading-relaxed text-(ink3)">
              “The web just feels quieter here.” — early users
            </div>
          </div>
        </div>

        {/* ---- Right: auth card ---- */}
        <div className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[420px]"
          >
            {/* mobile brand */}
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <BrandMark />
              <div>
                <div className="font-serif text-[15px] font-medium leading-none tracking-tight text-(ink)">Slow Spider</div>
                <div className="text-[11px] tracking-wide text-(muted)">A calm, single-screen organizer</div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[22px] border border-(line) bg-(panel) shadow-[0_16px_48px_rgba(58,52,38,0.08),0_2px_12px_rgba(58,52,38,0.06)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
              {/* top hairline accent */}
              <div className="h-[3px] w-full bg-linear-to-r from-(ink) via-(ink)/70 to-(logo-dot)/60 opacity-90" />

              <div className="px-7 py-7 sm:px-8 sm:py-8">
                {/* header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-[22px] font-[500] leading-none tracking-tight text-(ink)">
                      {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
                    </h2>
                    <p className="mt-2 max-w-[30ch] text-[13px] leading-relaxed text-(muted)">
                      {mode === "login"
                        ? "Log in with your email and password."
                        : mode === "signup"
                          ? "We’ll verify your email first — then set a password."
                          : "We’ll send a 6-digit code to your email."}
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-(line) bg-(bg) px-2.5 py-1 text-[11px] tracking-wide text-(muted)">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Encrypted
                  </span>
                </div>

                {/* stepper for multi-step flows */}
                {isMultiStep && (
                  <div className="mt-5 flex items-center gap-2">
                    {["Email", "Code", "Password"].map((label, i) => {
                      const active = i === stepIndex;
                      const done = i < stepIndex;
                      return (
                        <div key={label} className="flex items-center gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                done
                                  ? "flex size-6 items-center justify-center rounded-full bg-(ink) text-[11px] font-medium text-white"
                                  : active
                                    ? "flex size-6 items-center justify-center rounded-full border-2 border-(ink) bg-(panel) text-[11px] font-medium text-(ink)"
                                    : "flex size-6 items-center justify-center rounded-full border border-(line) bg-(bg) text-[11px] text-(ink3)"
                              }
                            >
                              {done ? "✓" : i + 1}
                            </span>
                            <span
                              className={
                                active ? "text-[12px] font-medium text-(ink)" : done ? "text-[12px] text-(ink)" : "text-[12px] text-(ink3)"
                              }
                            >
                              {label}
                            </span>
                          </div>
                          {i < 2 && (
                            <span className={`mx-1 h-px flex-1 ${i < stepIndex ? "bg-(ink)" : "bg-(line)"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6">
                  <AnimatePresence mode="wait">
                    {mode === "login" && (
                      <motion.form key="login" {...fadeStep} onSubmit={submitLogin} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-[11px] font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
                            Email
                          </Label>
                          <div className="relative flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-900/80 px-3.5 h-11 transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:bg-white dark:focus-within:bg-neutral-900 shadow-2xs">
                            <Mail className="pointer-events-none size-4.5 shrink-0 text-neutral-400 dark:text-neutral-500 mr-2.5 transition-colors group-focus-within:text-purple-500" />
                            <input
                              id="email"
                              type="email"
                              autoComplete="email"
                              placeholder="you@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              autoFocus
                              className="h-full w-full flex-1 bg-transparent border-none text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:outline-none focus:ring-0 p-0"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-[11px] font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
                              Password
                            </Label>
                            <button
                              type="button"
                              onClick={() => resetToMode("forgot")}
                              className="text-[12px] text-neutral-500 hover:text-purple-500 hover:underline underline-offset-4 transition-colors cursor-pointer"
                            >
                              Forgot?
                            </button>
                          </div>
                          <div className="relative flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-900/80 px-3.5 h-11 transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:bg-white dark:focus-within:bg-neutral-900 shadow-2xs">
                            <Lock className="pointer-events-none size-4.5 shrink-0 text-neutral-400 dark:text-neutral-500 mr-2.5 transition-colors group-focus-within:text-purple-500" />
                            <input
                              id="password"
                              type={showLoginPw ? "text" : "password"}
                              autoComplete="current-password"
                              placeholder="••••••••"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              required
                              className="h-full w-full flex-1 bg-transparent border-none text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:outline-none focus:ring-0 p-0"
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPw((v) => !v)}
                              className="ml-2 rounded-lg p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                              aria-label={showLoginPw ? "Hide password" : "Show password"}
                              tabIndex={-1}
                            >
                              {showLoginPw ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={busy}
                          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-[14px] font-semibold text-white shadow-lg shadow-purple-500/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {busy ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Logging in…
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                              Log in <ArrowRight className="size-4 opacity-90" />
                            </span>
                          )}
                        </button>

                        <div className="flex items-center justify-center gap-1 pt-1 text-[13px]">
                          <span className="text-neutral-500 dark:text-neutral-400">No account?</span>
                          <button
                            type="button"
                            onClick={() => resetToMode("signup")}
                            className="font-semibold text-purple-600 dark:text-purple-400 underline decoration-purple-500/40 underline-offset-4 hover:decoration-purple-500 transition-colors cursor-pointer"
                          >
                            Create one
                          </button>
                        </div>
                      </motion.form>
                    )}

                    {mode !== "login" && step === "email" && (
                      <motion.form key={stepKey} {...fadeStep} onSubmit={submitEmailStep} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="email2" className="text-[11px] font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
                            Email address
                          </Label>
                          <div className="relative flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-900/80 px-3.5 h-11 transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:bg-white dark:focus-within:bg-neutral-900 shadow-2xs">
                            <Mail className="pointer-events-none size-4.5 shrink-0 text-neutral-400 dark:text-neutral-500 mr-2.5" />
                            <input
                              id="email2"
                              type="email"
                              autoComplete="email"
                              placeholder="you@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              autoFocus
                              className="h-full w-full flex-1 bg-transparent border-none text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:outline-none focus:ring-0 p-0"
                            />
                          </div>
                          <p className="text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                            {mode === "signup"
                              ? "We’ll email a 6-digit code. It expires in 10 minutes."
                              : "Check your inbox for a 6-digit code."}
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={busy || !email}
                          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-[14px] font-semibold text-white shadow-lg shadow-purple-500/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {busy ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Sending…
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                              Send code <ArrowRight className="size-4 opacity-90" />
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => resetToMode("login")}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 py-2.5 text-[13px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="size-3.5" /> Back to log in
                        </button>
                      </motion.form>
                    )}

                    {mode !== "login" && step === "otp" && (
                      <motion.form key={stepKey} {...fadeStep} onSubmit={submitOtpStep} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="otp" className="text-[11px] font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
                            6-digit code
                          </Label>
                          <div className="relative flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-900/80 px-4 h-13 transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 shadow-2xs">
                            <input
                              id="otp"
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              placeholder="123456"
                              maxLength={6}
                              value={code}
                              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                              autoFocus
                              required
                              className="h-full w-full text-center text-[22px] font-mono font-bold tracking-[0.4em] bg-transparent border-none text-neutral-900 dark:text-neutral-100 outline-none focus:outline-none p-0"
                            />
                          </div>
                          <p className="text-center text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                            Sent to <b className="font-semibold text-neutral-900 dark:text-neutral-100">{email}</b>
                          </p>
                        </div>

                        {devCode && (
                          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-snug text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                            <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                            <span>
                              Dev mode — code is <b className="font-mono tracking-wide">{devCode}</b> (no email sent).
                            </span>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setStep("email")}
                            className="h-11 rounded-xl border border-neutral-200 dark:border-neutral-800 px-5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={busy || code.length !== 6}
                            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-linear-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-[14px] font-semibold text-white shadow-lg shadow-purple-500/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                          >
                            {busy ? "Verifying…" : "Verify"}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={submitEmailStep as unknown as React.MouseEventHandler}
                          disabled={busy}
                          className="w-full text-center text-[12.5px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:underline underline-offset-4 disabled:opacity-50 cursor-pointer"
                        >
                          Didn’t get it? Resend code
                        </button>
                      </motion.form>
                    )}

                    {mode !== "login" && step === "password" && (
                      <motion.form key={stepKey} {...fadeStep} onSubmit={submitPasswordStep} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="newpass" className="text-[11px] font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
                            {mode === "signup" ? "Create password" : "New password"}
                          </Label>
                          <div className="relative flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-900/80 px-3.5 h-11 transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:bg-white dark:focus-within:bg-neutral-900 shadow-2xs">
                            <Lock className="pointer-events-none size-4.5 shrink-0 text-neutral-400 dark:text-neutral-500 mr-2.5" />
                            <input
                              id="newpass"
                              type={showPw ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder="At least 6 characters"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              autoFocus
                              required
                              minLength={6}
                              className="h-full w-full flex-1 bg-transparent border-none text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:outline-none focus:ring-0 p-0"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPw((v) => !v)}
                              className="ml-2 rounded-lg p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                              aria-label={showPw ? "Hide password" : "Show password"}
                              tabIndex={-1}
                            >
                              {showPw ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                            </button>
                          </div>
                          <p className="text-[12px] text-neutral-500 dark:text-neutral-400">Use 8+ characters with letters & numbers for security.</p>
                        </div>

                        <button
                          type="submit"
                          disabled={busy}
                          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-[14px] font-semibold text-white shadow-lg shadow-purple-500/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {busy ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Saving…
                            </span>
                          ) : mode === "signup" ? (
                            "Create account"
                          ) : (
                            "Save new password"
                          )}
                        </button>

                        <p className="text-center text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
                          By continuing, you agree to our Terms and Privacy Policy.
                        </p>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {err && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        className="mt-4 flex gap-2.5 overflow-hidden rounded-xl border border-[var(--overdue)]/15 bg-[var(--overdue)]/8 px-3.5 py-2.5 text-[13px] leading-snug font-medium text-[var(--overdue)]"
                      >
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <span>{err}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* footer bar */}
              <div className="flex items-center justify-between border-t border-(line) bg-(bg) px-7 py-3 sm:px-8">
                <span className="text-[11px] tracking-wide text-(ink3)">© {new Date().getFullYear()} Slow Spider</span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-(ink3)">
                  <span className="size-1 rounded-full bg-(ink3)" />
                  Powered by JIORATECH
                </span>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-[11px] text-(muted) hover:text-(ink) underline decoration-(line) underline-offset-4 cursor-pointer"
                >
                  Privacy
                </a>
              </div>
            </div>

            {/* trust row below card */}
            <p className="mx-auto mt-4 max-w-[36ch] text-center text-[11px] leading-relaxed text-(ink3)">
              Your data stays in your workspace. Invite collaborators anytime — they see only what you share.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
