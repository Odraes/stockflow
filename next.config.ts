import type { NextConfig } from "next";

/**
 * Security headers sent with every response.
 * (A full script Content-Security-Policy needs per-request nonces, which makes
 * every page dynamic; only the frame-ancestors part is set here.)
 */
const securityHeaders = [
  // Clickjacking: never allow StockPilot inside another site's frame.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Don't let the browser guess file types (e.g. treat a CSV as a script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (with filters) to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // StockPilot needs none of these browser features.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Always use HTTPS after the first visit (ignored by browsers on http://localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false, // don't advertise the framework
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
