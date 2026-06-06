interface IconProps {
  size?: number;
  weight?: number;
  style?: React.CSSProperties;
  className?: string;
}

const icon =
  (path: React.ReactNode) =>
  ({ size = 20, weight = 1.6, style, className }: IconProps = {}) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
    >
      {path}
    </svg>
  );

export const Bell = icon(
  <>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </>,
);

export const SpeakerOn = icon(
  <>
    <path d="M11 5 6 9H3v6h3l5 4V5z" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </>,
);

export const SpeakerOff = icon(
  <>
    <path d="M11 5 6 9H3v6h3l5 4V5z" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </>,
);
