/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // app-build-manifest.json isn't served by `next start` — precaching it
  // poisons the whole install (one 404 fails the worker). Exclude it.
  buildExcludes: [/app-build-manifest\.json$/],
  // Offline-first where honesty allows:
  // - Cards/passes (HTML): network-first, fall back to last seen.
  // - Pass/card APIs: network-first, cached for offline opens.
  // - Uploaded photos: cache-first (immutable, long-lived).
  // Never cached: mutations (POST), sessions, dashboards (stale money lies).
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/[^/]+\/[cb]\//,
      handler: "NetworkFirst",
      options: { cacheName: "viewproof-pages", expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 3600 } },
    },
    {
      urlPattern: /^https?:\/\/[^/]+\/api\/(bookings|cards)\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "viewproof-pass-api",
        expiration: { maxEntries: 100, maxAgeSeconds: 24 * 3600 },
      },
    },
    {
      urlPattern: /^https?:\/\/[^/]+\/api\/uploads/,
      handler: "CacheFirst",
      options: {
        cacheName: "viewproof-photos",
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/webp"],
  },
};

module.exports = withPWA(nextConfig);
