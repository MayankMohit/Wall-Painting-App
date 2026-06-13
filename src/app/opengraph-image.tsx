import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Wallo — Job Management for Painting Contractors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1c1917",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent 0px, transparent 80px, rgba(255,255,255,0.025) 80px, rgba(255,255,255,0.025) 81px)",
          }}
        />

        {/* Top: logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "#e8612a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M14 6l4 4-7 7H7v-4z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 6l3-3 4 4-3 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 38, fontWeight: 700, color: "white", letterSpacing: "-0.03em" }}>
            Wallo
            <span style={{ color: "#e8612a" }}>.</span>
          </span>
        </div>

        {/* Middle: headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <p
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            The job site tool for<br />
            <span style={{ color: "#e8612a" }}>painting contractors.</span>
          </p>
        </div>

        {/* Bottom: tagline pills */}
        <div style={{ display: "flex", gap: 12 }}>
          {["Log walls", "Track approvals", "Ship invoices"].map((label) => (
            <div
              key={label}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
