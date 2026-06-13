import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist or has been moved.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-svh bg-(--ink) flex flex-col font-(--font) [-webkit-font-smoothing:antialiased] relative overflow-hidden">

      {/* Grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "repeating-linear-gradient(135deg, transparent 0 80px, rgba(255,255,255,.03) 80px 81px)" }}
      />

      {/* Logo */}
      <div className="relative px-8 pt-8">
        <Link href="/" className="inline-flex items-center gap-3 no-underline">
          <div className="w-9 h-9 rounded-[10px] overflow-hidden">
            <Image src="/app-icon.png" alt="Wallo" width={36} height={36} className="object-cover block" />
          </div>
          <span className="text-[20px] font-bold tracking-[-0.02em] text-white">
            Wallo<span className="text-(--accent)">.</span>
          </span>
        </Link>
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-[11px] font-semibold tracking-[0.15em] text-white/30 font-(--mono) mb-4">
          404
        </p>
        <h1 className="text-[48px] sm:text-[64px] font-bold tracking-[-0.04em] leading-[1] text-white">
          Lost on the<br />
          <span className="text-(--accent)">job site.</span>
        </h1>
        <p className="mt-5 text-[15px] text-white/50 max-w-xs leading-normal">
          This page doesn't exist or was moved. Head back and pick up where you left off.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/"
            className="h-[48px] px-7 rounded-full bg-(--accent) text-white font-semibold text-[14px] inline-flex items-center no-underline transition-opacity hover:opacity-90"
          >
            Go home
          </Link>
          <Link
            href="/login"
            className="h-[48px] px-7 rounded-full border border-white/15 text-white/60 font-semibold text-[14px] inline-flex items-center no-underline transition-colors hover:text-white/90"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="relative px-8 pb-8 flex justify-between text-[11px] text-white/20 tracking-wider font-(--mono)">
        <span>v1 · WEB</span>
        <span>© WALLO</span>
      </div>

    </div>
  );
}
