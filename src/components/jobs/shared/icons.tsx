const icon =
  (path: React.ReactNode) =>
  ({ size = 20, weight = 1.6, style }: { size?: number; weight?: number; style?: React.CSSProperties } = {}) => (
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
    >
      {path}
    </svg>
  );

export const ArrowL    = icon(<path d="M15 6l-6 6 6 6" />);
export const ArrowR    = icon(<path d="m9 6 6 6-6 6" />);
export const Plus      = icon(<><path d="M12 5v14M5 12h14" /></>);
export const Send      = icon(<path d="m4 12 16-8-7 18-2-8z" />);
export const X         = icon(<><path d="M6 6l12 12M18 6 6 18" /></>);
export const ImageIcon = icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5L5 20" /></>);
export const Brush     = icon(<><path d="M14 6l4 4-7 7H7v-4z"/><path d="M14 6l3-3 4 4-3 3"/></>);
