import type { Metadata } from "next";
import RegisterForm from "@/components/auth/forms/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create your Wallo account as a painting contractor or business owner. Get started in minutes.",
  openGraph: {
    title: "Create a Wallo Account",
    description:
      "Join Wallo as a painter or business owner. Log walls, track approvals, ship invoices.",
    url: "https://wallo.cc/register",
  },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
