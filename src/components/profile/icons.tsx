type IcoProps = { size?: number; weight?: number; style?: React.CSSProperties };

const ico = (d: React.ReactNode) =>
  ({ size = 20, weight = 1.6, style }: IcoProps = {}) => (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round"
      style={style}
    >{d}</svg>
  );

export const AlertIco  = ico(<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>);
export const ChevRight = ico(<polyline points="9 18 15 12 9 6" />);
export const ChevDown  = ico(<polyline points="6 9 12 15 18 9" />);
export const EyeOff    = ico(<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>);
