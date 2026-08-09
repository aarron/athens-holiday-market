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
  images: {
    // Artist photos live on Vercel Blob; allow next/image to optimize them.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  // @napi-rs/canvas ships a native .node addon (used by the social-kit spotlight
  // renderer). Keep it external so Next requires it from node_modules at runtime
  // instead of trying to bundle the binary (which breaks resolution).
  serverExternalPackages: ["@napi-rs/canvas"],
  // The social-kit spotlight renderer reads the brand font + logo from disk at
  // runtime (server-side canvas). Public assets aren't in the serverless function
  // filesystem by default, so trace them into every route that can trigger a
  // build: the daily cron, admin server actions, and API routes.
  outputFileTracingIncludes: {
    "/api/**": ["./public/kit/jost.ttf", "./public/brand/logo.png"],
    "/admin/**": ["./public/kit/jost.ttf", "./public/brand/logo.png"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
