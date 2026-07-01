import type { NextConfig } from "next";

// Page-level Content-Security-Policy (M-2). The structural directives (default-src
// 'self', base-uri, object-src, frame-ancestors, form-action) are the hard wins:
// they block base-tag/plugin injection, clickjacking, and off-site form posts.
// Resource origins stay permissive (`https:`) so Cloudinary images, R2 signed-URL
// downloads/previews, the Office web viewer iframe, and Firebase FCM keep working
// without per-deploy origin bookkeeping. Enforced in production only — dev needs
// ws: (HMR) and eval, which this would otherwise break. Tightening script-src to
// nonces + explicit connect-src is the Option B follow-up.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-src 'self' https:",
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io', '*.trycloudflare.com'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control',     value: 'off' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
