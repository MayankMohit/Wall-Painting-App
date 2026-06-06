// Minimal SVG icons matching the design handoff (Lucide-ish, 24×24 viewBox)

interface IconProps {
  size?: number;
  weight?: number;
  style?: React.CSSProperties;
  className?: string;
}

const icon =
  (path: React.ReactNode) =>
  ({ size = 20, weight = 1.6, style, className }: IconProps = {}) =>
    (
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

export const ArrowLeft  = icon(<path d="M15 6l-6 6 6 6"/>);
export const ArrowRight = icon(<path d="m9 6 6 6-6 6"/>);
export const Eye        = icon(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>);
export const EyeOff     = icon(<><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.5"/><path d="M6.5 7.5A17 17 0 0 0 2 12s4 6 10 6a10 10 0 0 0 3.5-.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>);
export const Check      = icon(<path d="m5 12 5 5 9-11"/>);
export const Send       = icon(<path d="m4 12 16-8-7 18-2-8z"/>);
export const Shield     = icon(<path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6z"/>);
export const Clock      = icon(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>);
export const Alert      = icon(<><path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.5"/></>);
export const Brush      = icon(<><path d="M14 6l4 4-7 7H7v-4z"/><path d="M14 6l3-3 4 4-3 3"/></>);
export const Briefcase  = icon(<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></>);
export const X          = icon(<><path d="M6 6l12 12M18 6 6 18"/></>);
