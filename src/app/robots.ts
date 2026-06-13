import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/install"],
      disallow: [
        "/owner/",
        "/painter/",
        "/admin/",
        "/api/",
        "/join/",
        "/pending-approval",
        "/forgot-password",
        "/reset-password",
        "/dev/",
      ],
    },
    sitemap: "https://wallo.cc/sitemap.xml",
  };
}
