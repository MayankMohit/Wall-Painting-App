"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

function getRedirectPath(role: string, status: string): string {
  if (role === "owner") return status !== "active" ? "/pending-approval" : "/owner/jobs";
  return `/${role}/dashboard`;
}

export default function LandingRedirect() {
  const router = useRouter();
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("wallpainter_token");
    if (!token) return;
    setChecking(true);
    checkAuth().catch(() => {}).finally(() => setChecking(false));
  }, [checkAuth]);

  useEffect(() => {
    if (!checking && isAuthenticated && user) {
      router.replace(getRedirectPath(user.role, user.status));
    }
  }, [checking, isAuthenticated, user, router]);

  if (!checking) return null;

  return (
    <div className="fixed inset-0 z-50 landing-bg flex items-center justify-center">
      <div className="landing-spinner" />
    </div>
  );
}
