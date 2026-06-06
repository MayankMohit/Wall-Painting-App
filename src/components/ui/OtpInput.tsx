'use client';

export function OtpInput({ value, onChange, disabled, error, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string | null;
  placeholder?: string;
}) {
  return (
    <div>
      <div className={[
        'h-11 bg-(--paper-2) border rounded-(--r) px-3 flex items-center',
        error ? 'border-(--rejected)' : 'border-(--border-2)',
      ].join(' ')}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          disabled={disabled}
          placeholder={placeholder ?? 'Enter 6-digit code'}
          className="flex-1 bg-transparent border-0 outline-none text-[14px] tracking-[.15em] font-(--mono) text-(--ink) placeholder:text-(--ink-4) placeholder:tracking-normal"
        />
      </div>
      {error && <div className="text-[11px] text-(--rejected) mt-1">{error}</div>}
    </div>
  );
}
