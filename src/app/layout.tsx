import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/common/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wallo.cc"),
  title: {
    default: "Wallo",
    template: "%s | Wallo",
  },
  description:
    "The job site tool for painting contractors. Log walls, track approvals, and ship invoices — all in one place.",
  keywords: [
    "painting contractor app",
    "wall painting job management",
    "contractor job tracker",
    "photo approval tool",
    "painting business software",
  ],
  authors: [{ name: "Wallo", url: "https://wallo.cc" }],
  creator: "Wallo",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://wallo.cc",
    siteName: "Wallo",
    title: "Wallo — Job Management for Painting Contractors",
    description:
      "Log walls, track approvals, ship invoices. The job site tool built for painting contractors.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wallo — Job Management for Painting Contractors",
    description:
      "Log walls, track approvals, ship invoices. Built for the trades.",
  },
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Capture beforeinstallprompt before React hydrates so the install page never misses it */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__installPrompt = e;
          });
        `}} />
      </head>
      <body className="min-h-full flex flex-col">
          <Providers>{children}</Providers>
        </body>
    </html>
  );
}
