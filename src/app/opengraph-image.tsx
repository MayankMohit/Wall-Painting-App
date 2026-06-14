import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Wallo — Job Management for Painting Contractors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  ).then((r) => r.text());
  const fontUrl = css.match(/src: url\((.+?)\) format/)?.[1] ?? "";
  const fontData = await fetch(fontUrl).then((r) => r.arrayBuffer());

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
          fontFamily: "Inter, system-ui, sans-serif",
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

        {/* Top row: big icon left, Wallo text right */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 48 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://wallo.cc/app-icon.png"
            width={240}
            height={240}
            style={{ borderRadius: 32 }}
            alt="Wallo logo"
          />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 250, fontWeight: 800, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>Wallo</span>
            <div style={{ width: 40, height: 40, background: "#e8612a", marginBottom: 35 }} />
          </div>
        </div>

        {/* Headline — wraps naturally */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.08,
          }}
        >
          <span style={{ color: "white" }}>The job site tool for&nbsp;</span>
          <span style={{ color: "#e8612a" }}>painting contractors.</span>
        </div>

        {/* Bottom: tag pills */}
        <div style={{ display: "flex", gap: 12 }}>
          {["Log walls", "Track approvals", "Ship invoices"].map((label) => (
            <div
              key={label}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 25,
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Inter", data: fontData, weight: 800, style: "normal" }],
    },
  );
}
