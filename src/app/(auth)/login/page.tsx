import type { Metadata } from "next";
import LoginForm from "@/components/auth/forms/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Wallo account to manage jobs, submit work, and track approvals.",
  openGraph: {
    title: "Sign In to Wallo",
    description: "Sign in to manage jobs and track your painting work.",
    url: "https://wallo.cc/login",
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
