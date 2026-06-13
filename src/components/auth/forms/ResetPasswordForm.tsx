"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import Button from "@/components/ui/Button";
import { ArrowLeft, Eye, EyeOff, Shield, Check, ArrowRight } from "@/components/auth/icons";

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-[12px] ${met ? "text-(--approved)" : "text-(--ink-3)"}`}>
      <div className={["w-4 h-4 rounded-full shrink-0 border-[1.5px] flex items-center justify-center transition-[background,border-color] duration-150", met ? "border-(--approved) bg-(--approved)" : "border-(--border-3) bg-transparent"].join(" ")}>
        {met && <Check size={10} weight={2.8} style={{ color: "#fff" }} />}
      </div>
      {label}
    </div>
  );
}

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const rules = [
    { met: password.length >= 8, label: "At least 8 characters" },
    { met: /[A-Z]/.test(password), label: "One uppercase letter" },
    { met: /[0-9]/.test(password), label: "One number" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) { setError("Invalid or missing reset token. Please request a new link."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) {
        const e = (json.data ?? json).error;
        setError((typeof e === "string" ? e : e?.message) ?? "Failed to reset password. The link may have expired.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="px-4.5 py-7 rounded-(--r) bg-(--approved-soft) border border-(--approved) flex flex-col items-center gap-3.5 text-center">
        <div className="w-11 h-11 rounded-full bg-(--approved) flex items-center justify-center text-white">
          <Check size={20} weight={2.4} />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-(--approved) m-0">Password updated!</p>
          <p className="text-[13px] text-(--approved) mt-1 opacity-70 m-0">Redirecting you to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {error && (
        <div className="px-3.5 py-2.5 bg-(--rejected-soft) border border-(--rejected) rounded-(--r) text-[13px] text-(--rejected)">
          {error}
        </div>
      )}
      <AuthField
        label="New password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
        required
        disabled={submitting}
        trailing={
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-(--ink-3) bg-none border-none cursor-pointer flex p-0">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />
      {password.length > 0 && (
        <div className="flex flex-col gap-1.75 pl-0.5">
          {rules.map((r) => <PasswordRule key={r.label} met={r.met} label={r.label} />)}
        </div>
      )}
      <AuthField
        label="Confirm password"
        type={showConfirm ? "text" : "password"}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
        required
        disabled={submitting}
        trailing={
          <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-(--ink-3) bg-none border-none cursor-pointer flex p-0">
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />
      <Button type="submit" variant="primary" size="lg" full disabled={submitting || !password || !confirm} trailing={<ArrowRight size={18} weight={2.2} />}>
        {submitting ? "Updating…" : "Reset password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordForm() {
  return (
    <AuthShell tagline={<>One last<br />step.</>}>
      <div className="px-6 pt-10 pb-12 lg:pt-0 lg:pb-0 lg:px-0">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] text-(--ink-3) no-underline mb-7">
          <ArrowLeft size={16} weight={2} />
          Back to sign in
        </Link>
        <div className="w-11 h-11 rounded-xl bg-(--accent-soft) flex items-center justify-center mb-5 text-(--accent-deep)">
          <Shield size={20} weight={2} />
        </div>
        <h1 className="text-[28px] font-bold tracking-tight text-(--ink) leading-[1.15]">Set new password</h1>
        <p className="text-[14px] text-(--ink-3) mt-1.5">Choose a strong password for your account.</p>
        <div className="mt-5.5">
          <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-(--border-2) border-t-(--ink) animate-spin" /></div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </AuthShell>
  );
}
