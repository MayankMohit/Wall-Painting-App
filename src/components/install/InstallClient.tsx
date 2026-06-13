"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Platform = "android" | "ios" | "desktop" | "unknown";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh|Windows|Linux/.test(ua)) return "desktop";
  return "unknown";
}

export default function InstallClient() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Pick up the event if it already fired before this component mounted
    const existing = (window as Window & { __installPrompt?: BeforeInstallPromptEvent }).__installPrompt;
    if (existing) {
      setInstallPrompt(existing);
    }

    // Also listen in case it fires after mount
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    setInstalling(true);
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstalling(false);
  }

  if (installed) {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 rounded-[18px] overflow-hidden mx-auto mb-5 shadow-(--shadow)">
            <Image src="/app-icon.png" alt="Wallo" width={64} height={64} className="object-cover" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-(--ink)">Wallo is installed</h1>
          <p className="mt-2 text-[14px] text-(--ink-3)">You can open it from your home screen.</p>
          <Link
            href="/"
            className="mt-6 inline-flex h-[52px] px-8 items-center justify-center rounded-full bg-(--ink) text-white font-semibold text-[15px] no-underline"
          >
            Open Wallo
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* App identity */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-(--shadow) mb-4">
          <Image src="/app-icon.png" alt="Wallo" width={80} height={80} className="object-cover block" />
        </div>
        <h1 className="text-[28px] font-bold tracking-tight text-(--ink) leading-tight">
          Install Wallo
        </h1>
        <p className="mt-1.5 text-[14px] text-(--ink-3) max-w-xs leading-normal">
          Add Wallo to your home screen for quick access — no app store needed.
        </p>
      </div>

      {/* Android — programmatic prompt */}
      {platform === "android" && (
        <div className="flex flex-col gap-4">
          {installPrompt ? (
            <>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="h-[52px] w-full rounded-full bg-(--ink) text-white font-semibold text-[15px] cursor-pointer disabled:opacity-50 transition-opacity"
              >
                {installing ? "Installing…" : "Install Wallo"}
              </button>
              <p className="text-center text-[12px] text-(--ink-4)">
                Works offline after install. Takes under a second.
              </p>
            </>
          ) : (
            <div className="px-4 py-4 rounded-(--r-md) bg-(--paper-2) border border-(--border) text-[13px] text-(--ink-3) text-center leading-normal">
              Open this page in <strong className="text-(--ink-2)">Chrome</strong> on your Android
              device to get the install button.
            </div>
          )}
        </div>
      )}

      {/* iOS — manual instructions */}
      {platform === "ios" && (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-(--ink-3) text-center mb-1">
            Follow these steps in <strong className="text-(--ink-2)">Safari</strong>:
          </p>
          {[
            { step: "1", text: 'Tap the Share button at the bottom of the screen' },
            { step: "2", text: 'Scroll down and tap "Add to Home Screen"' },
            { step: "3", text: 'Tap "Add" in the top right corner' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3 px-4 py-3 rounded-(--r) bg-(--paper-2) border border-(--border)">
              <span className="w-6 h-6 rounded-full bg-(--ink) text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step}
              </span>
              <p className="text-[13px] text-(--ink-2) leading-normal">{text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Desktop */}
      {platform === "desktop" && (
        <div className="flex flex-col gap-4">
          {installPrompt ? (
            <>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="h-[52px] w-full rounded-full bg-(--ink) text-white font-semibold text-[15px] cursor-pointer disabled:opacity-50 transition-opacity"
              >
                {installing ? "Installing…" : "Install Wallo"}
              </button>
              <p className="text-center text-[12px] text-(--ink-4)">
                Installs as a standalone app on your desktop.
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-(--ink-3) text-center mb-1">
                Install from your browser address bar:
              </p>
              {[
                { label: "Chrome / Edge", text: 'Click the install icon (↓) in the address bar' },
                { label: "Safari (Mac)", text: 'Click Share → "Add to Dock"' },
              ].map(({ label, text }) => (
                <div key={label} className="px-4 py-3 rounded-(--r) bg-(--paper-2) border border-(--border)">
                  <p className="text-[12px] font-semibold text-(--ink-3) mb-0.5">{label}</p>
                  <p className="text-[13px] text-(--ink-2)">{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unknown / fallback */}
      {platform === "unknown" && (
        <div className="px-4 py-4 rounded-(--r-md) bg-(--paper-2) border border-(--border) text-[13px] text-(--ink-3) text-center leading-normal">
          Open <strong className="text-(--ink-2)">wallo.cc</strong> in Chrome on Android
          or Safari on iOS to install.
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/" className="text-[13px] text-(--ink-4) no-underline hover:text-(--ink-3) transition-colors">
          Go to app instead
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-(--paper) flex items-center justify-center p-6 font-(--font) [-webkit-font-smoothing:antialiased]">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
