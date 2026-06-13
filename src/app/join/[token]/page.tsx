import type { Metadata } from "next";
import JoinClient from "./JoinClient";

export const metadata: Metadata = {
  title: "Join Wallo",
  description: "Accept your invitation and get started with Wallo.",
  robots: { index: false, follow: false },
};

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  return <JoinClient params={params} />;
}
