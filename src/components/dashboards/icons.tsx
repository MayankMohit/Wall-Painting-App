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

export const Building = icon(
  <>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3" />
  </>,
);

export const Users = icon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c.7-3 3-5 6-5s5.3 2 6 5" />
    <circle cx="17" cy="7" r="2.5" />
    <path d="M15 14c2-1 4-1 6 0 1 .5 2 2 2 4" />
  </>,
);

export const ArrowRight = icon(<path d="m9 6 6 6-6 6" />);

export const Search = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);

export const X = icon(
  <>
    <path d="M6 6l12 12M18 6 6 18" />
  </>,
);

export const Wall = icon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <path d="M3 10h18M3 14h18M9 5v5M15 10v4M9 14v5" />
  </>,
);

export const Shutter = icon(
  <>
    <rect x="4" y="3" width="16" height="18" rx="1.5" />
    <path d="M7 7h10M7 10.5h10M7 14h10M7 17.5h10" />
  </>,
);

export const Van = icon(
  <>
    <path d="M2 17V7h11v10" />
    <path d="M13 10h5l3 3v4h-8" />
    <circle cx="7" cy="17.5" r="2" />
    <circle cx="17" cy="17.5" r="2" />
  </>,
);

export const JOB_TYPES: Record<
  string,
  { label: string; Icon: ReturnType<typeof icon> }
> = {
  wall:    { label: "Wall Painting",    Icon: Wall    },
  shutter: { label: "Shutter Painting", Icon: Shutter },
  van:     { label: "Van Painting",     Icon: Van     },
};
