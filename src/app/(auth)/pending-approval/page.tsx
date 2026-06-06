"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import AuthShell from "@/components/auth/AuthShell";
import Button from "@/components/ui/Button";
import { Clock, Check, X, Alert } from "@/components/auth/icons";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_CONTACT_EMAIL ?? "admin@wallpainter.com";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, logout, checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "owner") {
      router.replace(`/${user.role}/dashboard`);
      return;
    }
    if (user.status === "active") {
      router.replace("/owner/dashboard");
    }
  }, [user, router]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-(--paper) font-(--font)">
        <div className="w-6 h-6 rounded-full border-2 border-(--border-2) border-t-(--ink) animate-spin" />
      </div>
    );
  }

  const isSuspended = user.status === "suspended";

  const statusRows = [
    { label: "Email address", done: true },
    { label: "Phone number", done: true },
    {
      label: "Admin approval",
      done: false,
      pending: !isSuspended,
      rejected: isSuspended,
    },
  ];

  return (
    <AuthShell
      tagline={
        isSuspended ? (
          <>
            Registration
            <br />
            not approved.
          </>
        ) : (
          <>
            Almost
            <br />
            there.
          </>
        )
      }
    >
      <div className="px-6 pt-10 pb-12 lg:pt-0 lg:pb-0 lg:px-0">
        {/* Icon */}
        <div
          className={[
            "w-15 h-15 rounded-2xl flex items-center justify-center mb-6",
            isSuspended
              ? "bg-(--rejected-soft) text-(--rejected)"
              : "bg-(--pending-soft) text-(--pending)",
          ].join(" ")}
        >
          {isSuspended ? (
            <X size={26} weight={2.2} />
          ) : (
            <Clock size={26} weight={1.8} />
          )}
        </div>

        {/* Heading */}
        <h1 className="text-[28px] font-bold tracking-tight text-(--ink) leading-[1.15]">
          {isSuspended ? "Registration rejected" : "Account under review"}
        </h1>
        <p className="text-[14px] text-(--ink-3) mt-1.5 leading-normal">
          {isSuspended
            ? "Your owner account registration was not approved."
            : `An admin will review your account. We'll email ${user.email} once approved.`}
        </p>

        {/* Status checklist */}
        <div className="mt-6 rounded-(--r) border border-(--border) bg-(--surface) overflow-hidden">
          {statusRows.map((row, i) => (
            <div
              key={row.label}
              className={[
                "flex items-center justify-between px-4 py-3.25 text-[13px]",
                i > 0 ? "border-t border-(--border)" : "",
              ].join(" ")}
            >
              <span className="text-(--ink-2)">{row.label}</span>
              {row.done && (
                <div className="flex items-center gap-1.25 text-(--approved) font-semibold text-[12px]">
                  <Check size={14} weight={2.4} />
                  Verified
                </div>
              )}
              {row.pending && (
                <span className="text-[11px] font-bold tracking-[.04em] text-(--pending) bg-(--pending-soft) px-2 py-0.75 rounded-full">
                  PENDING
                </span>
              )}
              {row.rejected && (
                <span className="text-[11px] font-bold tracking-[.04em] text-(--rejected) bg-(--rejected-soft) px-2 py-0.75 rounded-full">
                  REJECTED
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Suspended appeal notice */}
        {isSuspended && (
          <div className="mt-4 px-3.5 py-3 rounded-(--r) bg-(--rejected-soft) border border-(--rejected) flex gap-2.5 items-start">
            <Alert
              size={15}
              style={{ flexShrink: 0, marginTop: 1, color: "var(--rejected)" }}
            />
            <p className="text-[12px] text-(--rejected) leading-normal m-0">
              If you believe this is a mistake, contact us at{" "}
              <a
                href={`mailto:${ADMIN_EMAIL}`}
                className="font-semibold text-(--rejected) underline"
              >
                {ADMIN_EMAIL}
              </a>
              .
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <Button variant="secondary" size="lg" full onClick={handleLogout}>
            Sign out
          </Button>
        </div>

        {/* Refresh hint */}
        <p className="mt-5 text-center text-[11px] text-(--ink-4) leading-normal">
          Approved accounts are redirected automatically.{" "}
          <button
            type="button"
            onClick={() => checkAuth()}
            className="text-(--accent-deep) bg-none border-none cursor-pointer text-[11px] font-(--font)"
          >
            Refresh status
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
