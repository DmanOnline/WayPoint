import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    runtimeCaching: [
      {
        // Next.js RSC/data requests (client-side navigation)
        urlPattern: /\/_next\/data\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "next-data",
          expiration: { maxEntries: 100 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        // Next.js App Router RSC flight requests
        urlPattern: ({ request }: { request: Request }) =>
          request.headers.get("RSC") === "1",
        handler: "NetworkFirst",
        options: {
          cacheName: "rsc-data",
          expiration: { maxEntries: 100 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        // Pages — full page navigations
        urlPattern: ({ request }: { request: Request }) =>
          request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: 50 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        // API calls — network first, serve cache when offline
        urlPattern: /\/api\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-data",
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        // Static assets (JS, CSS)
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        // Fonts
        urlPattern: /\.(?:woff2?|ttf|otf|eot)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
      {
        // Images
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);
