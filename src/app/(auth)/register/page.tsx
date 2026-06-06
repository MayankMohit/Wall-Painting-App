"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import { useAuthStore } from "@/store/authStore";
import AuthShell from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import Button from "@/components/ui/Button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Brush,
  Briefcase,
  Shield,
} from "@/components/auth/icons";

export default function RegisterPage() {
  const router = useRouter();
  const { registerUser, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"painter" | "owner">("painter");

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
  const [phoneOtpInput, setPhoneOtpInput] = useState("");
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneConfirming, setPhoneConfirming] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSessionId, setEmailSessionId] = useState<string | null>(null);
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailConfirming, setEmailConfirming] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  function resetPhoneVerification() {
    setPhoneVerified(false);
    setFirebaseIdToken(null);
    setConfirmationResult(null);
    setShowPhoneOtp(false);
    setPhoneOtpInput("");
    setPhoneError(null);
  }

  function resetEmailVerification() {
    setEmailVerified(false);
    setEmailSessionId(null);
    setShowEmailOtp(false);
    setEmailOtpInput("");
    setEmailError(null);
  }

  function handlePhoneChange(val: string) {
    setPhone(val);
    if (phoneVerified || confirmationResult) resetPhoneVerification();
  }

  function handleEmailChange(val: string) {
    setEmail(val);
    if (emailVerified || emailSessionId) resetEmailVerification();
  }

  function handleRoleChange(val: "painter" | "owner") {
    setRole(val);
    if (val === "painter") resetEmailVerification();
  }

  async function handleSendPhoneOtp() {
    setPhoneError(null);
    setPhoneSending(true);
    try {
      if (!recaptchaRef.current) {
        const container = document.getElementById("recaptcha-container");
        if (container) container.innerHTML = "";
        recaptchaRef.current = new RecaptchaVerifier(
          firebaseAuth,
          "recaptcha-container",
          { size: "invisible" },
        );
        await recaptchaRef.current.render();
      }
      const result = await signInWithPhoneNumber(
        firebaseAuth,
        phone,
        recaptchaRef.current,
      );
      setConfirmationResult(result);
      setShowPhoneOtp(true);
    } catch (e: unknown) {
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
        } catch {
          /* ignore */
        }
        recaptchaRef.current = null;
      }
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("invalid-phone-number"))
        setPhoneError(
          "Invalid phone number. Use E.164 format e.g. +919876543210",
        );
      else if (msg.includes("too-many-requests"))
        setPhoneError("Too many attempts. Please wait before trying again.");
      else
        setPhoneError(
          "Failed to send OTP. Check the phone number and try again.",
        );
    } finally {
      setPhoneSending(false);
    }
  }

  async function confirmPhoneOtp(otp: string) {
    if (!confirmationResult) return;
    setPhoneConfirming(true);
    setPhoneError(null);
    try {
      const credential = await confirmationResult.confirm(otp);
      const token = await credential.user.getIdToken();
      setFirebaseIdToken(token);
      setPhoneVerified(true);
      setShowPhoneOtp(false);
    } catch {
      setPhoneError("Incorrect OTP. Please try again.");
      setPhoneOtpInput("");
    } finally {
      setPhoneConfirming(false);
    }
  }

  function handlePhoneOtpChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setPhoneOtpInput(digits);
    if (digits.length === 6) confirmPhoneOtp(digits);
  }

  async function handleSendEmailOtp() {
    setEmailError(null);
    setEmailSending(true);
    try {
      const res = await fetch("/api/auth/verify/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        const e = (json.data ?? json).error;
        setEmailError(
          (typeof e === "string" ? e : e?.message) ?? "Failed to send OTP",
        );
        return;
      }
      setEmailSessionId((json.data ?? json).sessionId);
      setShowEmailOtp(true);
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setEmailSending(false);
    }
  }

  async function confirmEmailOtp(otp: string) {
    if (!emailSessionId) return;
    setEmailConfirming(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/auth/verify/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: emailSessionId, otp }),
      });
      const json = await res.json();
      if (!res.ok) {
        const e = (json.data ?? json).error;
        setEmailError(
          (typeof e === "string" ? e : e?.message) ??
            "Invalid OTP. Please try again.",
        );
        setEmailOtpInput("");
        return;
      }
      setEmailVerified(true);
      setShowEmailOtp(false);
    } catch {
      setEmailError("Network error. Please try again.");
      setEmailOtpInput("");
    } finally {
      setEmailConfirming(false);
    }
  }

  function handleEmailOtpChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setEmailOtpInput(digits);
    if (digits.length === 6) confirmEmailOtp(digits);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseIdToken) return;
    const success = await registerUser({
      name,
      email,
      phone,
      password,
      role,
      firebaseIdToken,
      ...(role === "owner" && {
        emailOtp: emailOtpInput,
        emailSessionId: emailSessionId!,
      }),
    });
    if (success) {
      router.push(
        role === "owner" ? "/pending-approval" : "/painter/dashboard",
      );
    }
  }

  const canSubmit =
    !!name &&
    !!email &&
    !!phone &&
    !!password &&
    phoneVerified &&
    (role === "painter" || emailVerified) &&
    !isLoading;

  const otpInputClass =
    "w-full h-11 rounded-(--r) border-[1.5px] border-(--ink) bg-(--surface) text-[20px] tracking-[.25em] text-center font-(--mono) text-(--ink) outline-none";

  const roles = [
    {
      id: "painter" as const,
      label: "Painter",
      description: "Submit work and track jobs",
      icon: <Brush size={18} />,
    },
    {
      id: "owner" as const,
      label: "Business owner",
      description: "Manage jobs and approve work",
      icon: <Briefcase size={18} />,
    },
  ];

  return (
    <AuthShell
      tagline={
        <>
          Create your
          <br />
          Wallo account.
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

        {/* Heading */}
        <h1 className="text-[28px] font-bold tracking-tight text-(--ink) leading-[1.15]">
          Create your account
        </h1>
        <p className="text-[14px] text-(--ink-3) mt-1.5">
          Join as a painter or business owner.
        </p>

        {error && (
          <div className="mt-4 px-3.5 py-2.5 bg-(--rejected-soft) border border-(--rejected) rounded-(--r) text-[13px] text-(--rejected)">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mt-5.5 flex flex-col gap-3.5">
            {/* Role picker */}
            <div className="flex flex-col gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleChange(r.id)}
                  className={[
                    "flex items-center gap-3 px-3.5 py-2.75 rounded-(--r) border-[1.5px] cursor-pointer w-full transition-[background,border-color] duration-[0.12s] font-(--font)",
                    role === r.id
                      ? "border-(--ink) bg-(--ink) text-white"
                      : "border-(--border-2) bg-(--surface) text-(--ink)",
                  ].join(" ")}
                >
                  <div
                    className={
                      role === r.id
                        ? "text-white/65 shrink-0"
                        : "text-(--ink-3) shrink-0"
                    }
                  >
                    {r.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-[13px] font-semibold">{r.label}</div>
                    <div
                      className={`text-[12px] mt-px ${role === r.id ? "text-white/55" : "text-(--ink-3)"}`}
                    >
                      {r.description}
                    </div>
                  </div>
                  <div
                    className={[
                      "w-4 h-4 rounded-full shrink-0 border-2 flex items-center justify-center",
                      role === r.id ? "border-white/40" : "border-(--border-3)",
                    ].join(" ")}
                  >
                    {role === r.id && (
                      <div className="w-1.75 h-1.75 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Full name */}
            <AuthField
              label="Full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              autoComplete="name"
              required
            />

            {/* Email */}
            <div>
              <AuthField
                label={
                  role === "owner" ? "Email — verification required" : "Email"
                }
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                locked={emailVerified}
                error={emailError ?? undefined}
                trailing={
                  emailVerified ? (
                    <div className="flex items-center gap-1 text-(--approved) text-[12px] font-semibold whitespace-nowrap">
                      <Check size={14} weight={2.4} />
                      Verified
                    </div>
                  ) : undefined
                }
              />
              {role === "owner" && !emailVerified && !showEmailOtp && (
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={!email || emailSending}
                  className={`mt-2 text-[12px] text-(--accent-deep) bg-none border-none cursor-pointer p-0 font-(--font) ${!email || emailSending ? "opacity-50" : "opacity-100"}`}
                >
                  {emailSending ? "Sending code…" : "Send verification code →"}
                </button>
              )}
              {role === "owner" && showEmailOtp && !emailVerified && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={emailOtpInput}
                    onChange={(e) => handleEmailOtpChange(e.target.value)}
                    maxLength={6}
                    disabled={emailConfirming}
                    placeholder={emailConfirming ? "Verifying…" : "· · · · · ·"}
                    autoFocus
                    className={otpInputClass}
                  />
                  <div className="mt-1.5 text-[11px] text-(--ink-3) flex justify-between">
                    <span>Code sent to {email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        resetEmailVerification();
                        handleSendEmailOtp();
                      }}
                      className="text-(--accent-deep) bg-none border-none cursor-pointer text-[11px] font-(--font)"
                    >
                      Resend
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <AuthField
                label="Phone — verification required"
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+919876543210"
                autoComplete="tel"
                required
                locked={phoneVerified}
                error={phoneError ?? undefined}
                trailing={
                  phoneVerified ? (
                    <div className="flex items-center gap-1 text-(--approved) text-[12px] font-semibold whitespace-nowrap">
                      <Check size={14} weight={2.4} />
                      Verified
                    </div>
                  ) : undefined
                }
              />
              {!phoneVerified && !showPhoneOtp && (
                <>
                  <p className="mt-1 text-[11px] text-(--ink-4)">
                    Include country code — e.g. +91 for India
                  </p>
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={!phone || phoneSending}
                    className={`mt-1.5 text-[12px] text-(--accent-deep) bg-none border-none cursor-pointer p-0 font-(--font) ${!phone || phoneSending ? "opacity-50" : "opacity-100"}`}
                  >
                    {phoneSending
                      ? "Sending code…"
                      : "Send verification code →"}
                  </button>
                </>
              )}
              {showPhoneOtp && !phoneVerified && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={phoneOtpInput}
                    onChange={(e) => handlePhoneOtpChange(e.target.value)}
                    maxLength={6}
                    disabled={phoneConfirming}
                    placeholder={phoneConfirming ? "Verifying…" : "· · · · · ·"}
                    autoFocus
                    className={otpInputClass}
                  />
                  <div className="mt-1.5 text-[11px] text-(--ink-3) flex justify-between">
                    <span>Code sent to {phone}</span>
                    <button
                      type="button"
                      onClick={() => {
                        resetPhoneVerification();
                        handleSendPhoneOtp();
                      }}
                      className="text-(--accent-deep) bg-none border-none cursor-pointer text-[11px] font-(--font)"
                    >
                      Resend
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Password */}
            <AuthField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              required
            />

            {/* Owner info notice */}
            {role === "owner" && (
              <div className="px-3.5 py-3 rounded-(--r) bg-(--info-soft) border border-(--info) flex gap-2.5 items-start">
                <Shield
                  size={15}
                  style={{ flexShrink: 0, marginTop: 1, color: "var(--info)" }}
                />
                <p className="text-[12px] text-(--info) leading-normal m-0">
                  Business owner accounts require email + phone verification and
                  are reviewed by an admin before activation.
                </p>
              </div>
            )}

            {/* Terms */}
            <p className="text-[11px] text-(--ink-4) leading-normal">
              By creating an account you agree to our{" "}
              <Link href="/terms" className="text-(--ink-3) underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-(--ink-3) underline">
                Privacy Policy
              </Link>
              .
            </p>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              full
              disabled={!canSubmit}
              trailing={<ArrowRight size={18} weight={2.2} />}
            >
              {isLoading ? "Creating account…" : "Create account"}
            </Button>
          </div>
        </form>

        <p className="mt-7 text-center text-[13px] text-(--ink-3)">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-(--ink) font-semibold no-underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div id="recaptcha-container" />
    </AuthShell>
  );
}
