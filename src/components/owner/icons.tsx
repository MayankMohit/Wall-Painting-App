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

// Re-exported from shared icon sets for single import in owner components
export { Building, Users, ArrowRight, Search, X, Wall, Shutter, Van, JOB_TYPES } from '@/components/dashboards/icons';

// Owner-specific icons
export const ArrowLeft  = icon(<><path d="M19 12H5M12 5l-7 7 7 7" /></>);
export const Spark      = icon(<><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></>);
export const Plus       = icon(<><path d="M12 5v14M5 12h14" /></>);
export const Clock      = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const Check      = icon(<path d="m5 12 5 5 9-11" />);
export const Menu       = icon(<><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></>);
export const Brush      = icon(<><path d="M14 6l4 4-7 7H7v-4z" /><path d="M14 6l3-3 4 4-3 3" /></>);
export const Bell       = icon(<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
export const UserIcon   = icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 5-6 8-6s7 2 8 6" /></>);
export const LogoutIcon = icon(<><path d="M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4" /><path d="m10 16 4-4-4-4" /><path d="M14 12H3" /></>);
export const List       = icon(<><path d="M4 6h16M4 12h16M4 18h10" /></>);
export const Trash      = icon(<><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7" /><path d="M10 11v5M14 11v5" /></>);
export const FileIcon   = icon(<><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4" /></>);
