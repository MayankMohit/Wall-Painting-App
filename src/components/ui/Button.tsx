import Link from "next/link";
import { CSSProperties } from "react";

type Variant =
  | "primary"
  | "accent"
  | "secondary"
  | "ghost"
  | "danger"
  | "approve";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: CSSProperties;
  full?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

const sizeClasses: Record<Size, string> = {
  sm: "h-9 text-[13px]",
  md: "h-11 text-[14px]",
  lg: "h-[52px] text-[16px]",
};

const variantClasses: Record<Variant, string> = {
  primary: "bg-(--ink) text-white border-transparent",
  accent: "bg-(--accent) text-white border-transparent",
  secondary: "bg-(--surface) text-(--ink) border-(--border-2)",
  ghost: "bg-transparent text-(--ink) border-transparent",
  danger: "bg-(--rejected) text-white border-transparent",
  approve: "bg-(--approved) text-white border-transparent",
};

export default function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  className = "",
  style,
  full = false,
  leading,
  trailing,
}: ButtonProps) {
  const baseClasses = [
    "px-[18px]",
    "rounded-full",
    "border",
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-2",
    "font-semibold",
    "tracking-[-0.005em]",
    "no-underline",
    disabled ? "cursor-not-allowed" : "cursor-pointer",
    disabled ? "opacity-45" : "opacity-100",
    "transition-opacity",
    "duration-150",
    full ? "w-full" : "w-auto",
    sizeClasses[size],
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={baseClasses} style={style}>
        {leading}
        {children}
        {trailing}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
      style={style}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}
