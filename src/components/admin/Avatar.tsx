export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.35),
        background: 'var(--ink-2)',
      }}
    >
      {initials}
    </div>
  );
}
