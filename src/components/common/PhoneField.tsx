"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Country dial codes. `iso` is the unique key (dial codes can repeat, e.g. +1),
 * `dial` is the E.164 prefix that gets prepended to the national number.
 */
interface Country {
  iso: string;
  name: string;
  dial: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { iso: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { iso: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩" },
  { iso: "NP", name: "Nepal", dial: "+977", flag: "🇳🇵" },
  { iso: "LK", name: "Sri Lanka", dial: "+94", flag: "🇱🇰" },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
];

const DEFAULT = COUNTRIES[0]; // India / +91

// Pick the country whose dial code is the longest prefix of an E.164 value.
function countryFromValue(value: string): Country {
  if (!value || !value.startsWith("+")) return DEFAULT;
  const match = COUNTRIES.filter((c) => value.startsWith(c.dial)).sort(
    (a, b) => b.dial.length - a.dial.length,
  )[0];
  return match ?? DEFAULT;
}

interface PhoneFieldProps {
  label?: string;
  value: string; // full E.164 string, e.g. "+919876543210" (or "" when empty)
  onChange: (e164: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
}

export default function PhoneField({
  label,
  value,
  onChange,
  hint,
  error,
  required,
}: PhoneFieldProps) {
  // Initialise dial code + national number from any incoming value (once).
  const initialCountry = countryFromValue(value);
  const [country, setCountry] = useState<Country>(initialCountry);
  const [national, setNational] = useState(() =>
    value ? value.slice(initialCountry.dial.length) : "",
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function emit(dial: string, nat: string) {
    onChange(nat ? `${dial}${nat}` : "");
  }

  function handleSelect(c: Country) {
    setCountry(c);
    setOpen(false);
    emit(c.dial, national);
  }

  function handleNational(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 14);
    setNational(digits);
    emit(country.dial, digits);
  }

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
          {label}
        </div>
      )}
      <div
        className={[
          "flex items-center h-12 rounded-(--r) border bg-(--surface) transition-[border-color] duration-150",
          error ? "border-(--rejected)" : "border-(--border-2)",
        ].join(" ")}
      >
        {/* Country selector */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 h-full pl-3.5 pr-2.5 text-[15px] text-(--ink) font-(--font) cursor-pointer bg-transparent border-none shrink-0"
          aria-label="Select country code"
          aria-expanded={open}
        >
          <span className="text-[16px] leading-none">{country.flag}</span>
          <span className="font-(--mono) text-[14px]">{country.dial}</span>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            className={`text-(--ink-3) transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="w-px h-6 bg-(--border-2) shrink-0" />

        {/* National number */}
        <input
          type="tel"
          inputMode="numeric"
          value={national}
          onChange={(e) => handleNational(e.target.value)}
          placeholder="9876543210"
          autoComplete="tel-national"
          required={required}
          className="flex-1 min-w-0 h-full border-none outline-none bg-transparent px-3 text-[15px] text-(--ink) font-(--font) tracking-[-0.005em]"
        />
      </div>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto rounded-(--r) border border-(--border-2) bg-(--surface) shadow-lg py-1">
          {COUNTRIES.map((c) => (
            <button
              key={c.iso}
              type="button"
              onClick={() => handleSelect(c)}
              className={[
                "flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left cursor-pointer bg-transparent border-none",
                c.iso === country.iso ? "bg-(--paper-2)" : "hover:bg-(--paper-2)",
              ].join(" ")}
            >
              <span className="text-[16px] leading-none">{c.flag}</span>
              <span className="flex-1 text-[13px] text-(--ink) truncate">
                {c.name}
              </span>
              <span className="font-(--mono) text-[12px] text-(--ink-3)">
                {c.dial}
              </span>
            </button>
          ))}
        </div>
      )}

      {(error || hint) && (
        <p
          className={`mt-1.5 text-[11px] ${error ? "text-(--rejected)" : "text-(--ink-3)"}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
