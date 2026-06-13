import type { Metadata } from "next";
import InstallClient from "@/components/install/InstallClient";

export const metadata: Metadata = {
  title: "Install Wallo",
  description:
    "Add Wallo to your home screen for quick access. No app store needed — install directly from your browser in one tap.",
  openGraph: {
    title: "Install Wallo",
    description: "Add Wallo to your home screen. No app store needed.",
    url: "https://wallo.cc/install",
  },
};

export default function InstallPage() {
  return <InstallClient />;
}
