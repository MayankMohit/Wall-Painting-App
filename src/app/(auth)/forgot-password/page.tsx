"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import Button from "@/components/ui/Button";
import { ArrowLeft, Send, Alert, Check } from "@/components/auth/icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        const e = (json.data ?? json).error;
        setError(
          (typeof e === "string" ? e : e?.message) ??
            "Something went wrong. Please try again.",
        );
        return;
      }
      setMessage((json.data ?? json).message);
      setDone(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      tagline={
        <>
          Forgotten your
          <br />
          password?
        </>
      }
    >
      <div className="px-6 pt-10 pb-12 lg:pt-0 lg:pb-0 lg:px-0">
        {/* Back */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-(--ink-3) no-underline mb-7"
        >
          <ArrowLeft size={16} weight={2} />
          Back to sign in
        </Link>

        {/* Icon box */}
        <div className="w-11 h-11 rounded-xl bg-(--accent-soft) flex items-center justify-center mb-5 text-(--accent-deep)">
          <Send size={20} weight={2} />
        </div>

        {/* Heading */}
        <h1 className="text-[28px] font-bold tracking-tight text-(--ink) leading-[1.15]">
          Forgot password?
        </h1>
        <p className="text-[14px] text-(--ink-3) mt-1.5">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <div className="mt-5.5">
          {!done ? (
            <>
              {error && (
                <div className="mb-3.5 px-3.5 py-2.5 bg-(--rejected-soft) border border-(--rejected) rounded-(--r) text-[13px] text-(--rejected)">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <AuthField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={submitting}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  full
                  disabled={!email || submitting}
                  leading={<Send size={18} weight={2.2} />}
                >
                  {submitting ? "Sending…" : "Send reset email"}
                </Button>
              </form>

              {/* Hint */}
              <div className="mt-4 px-3.5 py-3 rounded-(--r) bg-(--paper-2) border border-(--border) flex gap-2.5 items-start">
                <Alert
                  size={15}
                  style={{ flexShrink: 0, marginTop: 1, color: "var(--ink-3)" }}
                />
                <p className="text-[12px] text-(--ink-3) leading-normal m-0">
                  Check your spam folder if you don&apos;t see the email within
                  a few minutes.
                </p>
              </div>
            </>
          ) : (
            <div className="px-4.5 py-6 rounded-(--r) bg-(--approved-soft) border border-(--approved) flex flex-col items-center gap-3.5 text-center">
              <div className="w-11 h-11 rounded-full bg-(--approved) flex items-center justify-center text-white">
                <Check size={20} weight={2.4} />
              </div>
              <p className="text-[13px] text-(--approved) leading-normal m-0">
                {message ?? "Check your email for the reset link."}
              </p>
            </div>
          )}
        </div>

        {/* Bottom link */}
        <p className="mt-7 text-center text-[13px] text-(--ink-3)">
          Remembered it?{" "}
          <Link
            href="/login"
            className="text-(--ink) font-semibold no-underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
