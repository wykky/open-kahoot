import type { NextConfig } from "next";

// CSP pins script origins to self + Telegram (login widget). frame-ancestors 'none' blocks
// clickjacking. 'unsafe-inline' is still required for Next 15 bootstrap scripts; nonce
// migration is a separate task. img-src is permissive because user-imported quiz images
// can come from anywhere.
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://telegram.org https://oauth.telegram.org",
  "frame-src https://oauth.telegram.org",
  "img-src 'self' data: https:",
  "connect-src 'self' wss: https:",
  "style-src 'self' 'unsafe-inline'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: cspHeader },
        ],
      },
    ];
  },
};

export default nextConfig;
