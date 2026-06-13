import Image from 'next/image';

interface AuthShellProps {
  children: React.ReactNode;
  tagline?: React.ReactNode;
}

export default function AuthShell({ children, tagline }: AuthShellProps) {
  const defaultTagline = (
    <>
      The job site tool for
      <br />
      painting contractors.
    </>
  );

  return (
    <div className="min-h-svh flex font-(--font) [-webkit-font-smoothing:antialiased]">

      {/* ── Brand panel — hidden on mobile ─────────────────────── */}
      <div
        className="hidden lg:flex w-120 shrink-0 bg-(--ink) px-12 pt-12 pb-10 flex-col justify-between relative overflow-hidden"
      >
        {/* Grid overlay */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'repeating-linear-gradient(135deg, transparent 0 80px, rgba(255,255,255,.03) 80px 81px)' }}
        />

        <div className="relative">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] overflow-hidden">
              <Image src="/app-icon.png" alt="Wallo" width={40} height={40} className="object-cover block" />
            </div>
            <div className="text-[22px] font-bold tracking-[-0.02em] text-white">
              Wallo<span className="text-(--accent)">.</span>
            </div>
          </div>

          {/* Tagline */}
          <div className="mt-25 text-[48px] font-bold tracking-[-0.035em] leading-[1.05] text-white">
            {tagline || defaultTagline}
          </div>
          <p className="mt-4.5 text-[15px] text-white/60 leading-normal max-w-90">
            Log walls, track approvals, ship invoices. Built for the trades.
          </p>
        </div>

        {/* Footer */}
        <div className="relative flex justify-between text-[11px] text-white/35 tracking-wider font-(--mono)">
          <span>v1 · WEB</span>
          <span>© WALLO</span>
        </div>
      </div>

      {/* ── Form area ───────────────────────────────────────────── */}
      <div className="flex-1 bg-(--paper) flex flex-col">
        {/* Desktop: center the form */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-12">
          <div className="w-full max-w-110">
            {children}
          </div>
        </div>

        {/* Mobile: full width, pages manage their own spacing */}
        <div className="lg:hidden flex-1">
          {children}
        </div>
      </div>

    </div>
  );
}
