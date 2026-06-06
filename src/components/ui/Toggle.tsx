'use client';

export function Toggle({ checked, onChange, disabled }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className="relative shrink-0 rounded-full border-0 cursor-pointer focus:outline-none"
      style={{
        width: 38, height: 22,
        background: checked ? 'var(--ink)' : 'var(--border-3)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, width: 18, height: 18,
        borderRadius: 999, background: '#fff', transition: 'left 0.15s',
        left: checked ? 18 : 2,
      }} />
    </button>
  );
}
