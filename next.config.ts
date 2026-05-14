import type { NextConfig } from "next";

/**
 * Helmet-style security headers and env-driven CORS handling.
 * - Strict-Transport-Security forces HTTPS for 2 years
 * - X-Content-Type-Options blocks MIME sniffing
 * - Referrer-Policy and Permissions-Policy harden the browser surface
 * - Access-Control-Allow-Origin honors CORS_ORIGINS env var
 */
const allowedOrigins = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Access-Control-Allow-Origin",
            value: allowedOrigins.length === 1 ? allowedOrigins[0] : "*",
          },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-cron-secret" },
        ],
      },
    ];
  },
};

export default nextConfig;
