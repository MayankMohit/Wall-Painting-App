"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import AuthShell from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import Segmented from "@/components/auth/Segmented";
import Button from "@/components/ui/Button";
import { ArrowRight, Eye, EyeOff, Send, Check } from "@/components/auth/icons";

type Tab = "password" | "otp";

function redirectAfterLogin(
  role: string,
  status: string,
  router: ReturnType<typeof useRouter>,
) {
  if (role === "owner" && status !== "active") {
    router.push("/pending-approval");
    return;
  }
  // Honor ?next= set by the route guards, but only within the user's own role
  // section — this also rules out open redirects.
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith(`/${role}/`)) {
    router.push(next);
    return;
  }
  router.push(role === "owner" ? "/owner/jobs" : `/${role}/dashboard`);
}

export default function LoginForm() {
  const router = useRouter();
  const { login, loginWithEmailOtp, isLoading, error, clearError } = useAuthStore();

  const [tab, setTab] = useState<Tab>("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otpInput, setOtpInput] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => { clearError(); }, [clearError]);

  const isEmail = identifier.includes("@");

  function resetOtpState() {
    setOtpInput("");
    setShowOtp(false);
    setSendError(null);
    setSessionId(null);
  }

  function handleTabChange(idx: number) {
    setTab(idx === 0 ? "password" : "otp");
    resetOtpState();
    clearError();
  }

  function handleIdentifierChange(val: string) {
    setIdentifier(val);
    if (showOtp) resetOtpState();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const success = await login(identifier.trim(), password.trim());
    if (success) {
      const { user } = useAuthStore.getState();
      redirectAfterLogin(user!.role, user!.status, router);
    }
  }

  async function handleSendOtp() {
    setSendError(null);
    if (!isEmail) {
      setSendError("One-time codes are sent by email — enter your email address.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/login/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const json = await res.json();
      if (!res.ok) {
        const e = (json.data ?? json).error;
        setSendError((typeof e === "string" ? e : e?.message) ?? "Failed to send OTP");
        return;
      }
      setSessionId((json.data ?? json).sessionId);
      setShowOtp(true);
    } catch {
      setSendError("Failed to send OTP. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function confirmOtp(otp: string) {
    if (!sessionId) return;
    const success = await loginWithEmailOtp(sessionId, otp);
    if (success) {
      const { user } = useAuthStore.getState();
      redirectAfterLogin(user!.role, user!.status, router);
    }
  }

  function handleOtpChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setOtpInput(digits);
    if (digits.length === 6) confirmOtp(digits);
  }

  return (
    <AuthShell>
      <div className="px-6 pt-16 pb-12 lg:pt-0 lg:pb-0 lg:px-0">
        <div className="lg:hidden mb-8">
          <div className="w-9.5 h-9.5 rounded-[10px] overflow-hidden">
            <Image src="/app-icon.png" alt="Wallo" width={38} height={38} className="object-cover block" />
          </div>
        </div>

        <h1 className="text-[30px] font-bold tracking-tight text-(--ink) leading-[1.1]">
          Welcome back
        </h1>
        <p className="text-[14px] text-(--ink-3) mt-1.5">Sign in to continue your job.</p>

        <div className="mt-5.5">
          <Segmented
            items={["Password", "One‑time code"]}
            active={tab === "password" ? 0 : 1}
            onChange={handleTabChange}
          />
        </div>

        {(error || sendError) && (
          <div className="mt-3.5 px-3.5 py-2.5 bg-(--rejected-soft) border border-(--rejected) rounded-(--r) text-[13px] text-(--rejected)">
            {error || sendError}
          </div>
        )}

        <div className="mt-4.5 flex flex-col gap-3.5">
          <AuthField
            label={tab === "otp" ? "Email" : "Email or phone"}
            type={tab === "otp" ? "email" : "text"}
            value={identifier}
            onChange={(e) => handleIdentifierChange(e.target.value)}
            placeholder={tab === "otp" ? "you@example.com" : "you@example.com or +919876543210"}
            autoComplete={tab === "otp" ? "email" : "username"}
          />

          {tab === "password" && (
            <>
              <AuthField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-(--ink-3) bg-none border-none cursor-pointer flex p-0"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <div className="flex justify-between items-center mt-0.5">
                <label className="flex gap-2 items-center text-[13px] text-(--ink-2) cursor-pointer">
                  <span className="w-4.5 h-4.5 rounded-[5px] bg-(--ink) inline-flex items-center justify-center text-white shrink-0">
                    <Check size={12} weight={2.6} />
                  </span>
                  Stay signed in
                </label>
                <Link href="/forgot-password" className="text-[13px] text-(--accent-deep) font-semibold no-underline">
                  Forgot password?
                </Link>
              </div>
              <form onSubmit={handlePasswordSubmit} className="mt-2">
                <Button type="submit" variant="primary" size="lg" full disabled={isLoading} trailing={<ArrowRight size={18} weight={2.2} />}>
                  {isLoading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </>
          )}

          {tab === "otp" && !showOtp && (
            <>
              <p className="text-[12px] text-(--ink-3) leading-normal -mt-1">
                We&apos;ll email you a 6‑digit code. No password needed — enter the email on your account.
              </p>
              <Button variant="primary" size="lg" full disabled={!identifier || sending} onClick={handleSendOtp} leading={<Send size={18} weight={2.2} />}>
                {sending ? "Sending…" : "Send code"}
              </Button>
            </>
          )}

          {tab === "otp" && showOtp && (
            <>
              <div>
                <div className="text-[12px] font-semibold text-(--ink-2) mb-2">Enter the 6‑digit code</div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpInput}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  maxLength={6}
                  disabled={isLoading}
                  placeholder={isLoading ? "Verifying…" : "· · · · · ·"}
                  autoFocus
                  className="w-full h-14 rounded-(--r) border-[1.5px] border-(--ink) bg-(--surface) text-[22px] tracking-[.3em] text-center font-(--mono) text-(--ink) outline-none"
                />
                <div className="mt-2 text-[11px] text-(--ink-3) flex justify-between">
                  <span>Sent to {identifier}</span>
                  <button type="button" onClick={() => { resetOtpState(); handleSendOtp(); }} className="text-(--accent-deep) font-semibold bg-none border-none cursor-pointer text-[11px]">
                    Resend
                  </button>
                </div>
              </div>
              <Button variant="primary" size="lg" full disabled={otpInput.length < 6 || isLoading} onClick={() => confirmOtp(otpInput)} trailing={<ArrowRight size={18} weight={2.2} />}>
                {isLoading ? "Verifying…" : "Sign in"}
              </Button>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-[13px] text-(--ink-3)">
          New to Wallo?{" "}
          <Link href="/register" className="text-(--ink) font-semibold no-underline">Create account</Link>
        </p>
      </div>
    </AuthShell>
  );
}
