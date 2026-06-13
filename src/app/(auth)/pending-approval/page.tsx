import type { Metadata } from "next";
import PendingApprovalClient from "@/components/auth/forms/PendingApprovalClient";

export const metadata: Metadata = {
  title: "Account Under Review",
  description: "Your Wallo account is being reviewed by an admin.",
  robots: { index: false, follow: false },
};

export default function PendingApprovalPage() {
  return <PendingApprovalClient />;
}
