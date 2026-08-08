import type { NextConfig } from "next";

// Baseline security headers applied to every response. A full Content-Security-
// Policy is intentionally deferred: the app relies on Next's inline bootstrap
// script and a pre-paint inline motion script, so a strict CSP needs a nonce
// pass first (tracked in the security issue). These headers are safe today.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
