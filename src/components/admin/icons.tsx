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

export const ArrowLeft  = icon(<><path d="M19 12H5M12 5l-7 7 7 7" /></>);
export const ArrowRight = icon(<><path d="M5 12h14M12 5l7 7-7 7" /></>);
export const Bell       = icon(<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
export const UserIcon   = icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 5-6 8-6s7 2 8 6" /></>);
export const Users      = icon(<><circle cx="9" cy="7" r="3" /><path d="M17 20c0-2.8-3.6-5-8-5s-8 2.2-8 5" /><path d="M22 20c0-2-1.8-3.6-4-4" /><circle cx="18.5" cy="6" r="2.5" /></>);
export const LogoutIcon = icon(<><path d="M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4" /><path d="m10 16 4-4-4-4" /><path d="M14 12H3" /></>);
export const LayoutGrid = icon(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>);
export const FileText   = icon(<><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h4" /></>);
export const Briefcase  = icon(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>);
export const Server     = icon(<><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="6" cy="18" r="1" fill="currentColor" stroke="none" /></>);
export const Terminal   = icon(<><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></>);
export const Check      = icon(<path d="m5 12 5 5 9-11" />);
export const X          = icon(<><path d="M18 6 6 18M6 6l12 12" /></>);
export const Alert      = icon(<><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></>);
export const Refresh    = icon(<><path d="M4 4v5h5" /><path d="M20 20v-5h-5" /><path d="M4 9a9 9 0 0 1 15.7-3.7M20 15a9 9 0 0 1-15.7 3.7" /></>);
export const Shield     = icon(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>);
export const Clock      = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const Search     = icon(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>);
export const Filter     = icon(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>);
export const Download   = icon(<><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M16 11l-4 4-4-4M12 4v11" /></>);
export const Activity   = icon(<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>);
export const Cpu        = icon(<><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /></>);
export const Zap        = icon(<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />);
export const Menu       = icon(<><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></>);
export const List       = icon(<><path d="M4 6h16M4 12h16M4 18h10" /></>);
export const ChartBar   = icon(<><path d="M3 3v18h18" /><path d="M8 17V9M13 17V5M18 17v-6" /></>);
