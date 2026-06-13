import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/forms/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Wallo account password. Enter your email to receive a reset link.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
