"use client";

import { useEffect } from "react";

const ROUTES_TO_CACHE = [
  "/",
  "/tasks",
  "/habits",
  "/calendar",
  "/journal",
  "/finance",
  "/goals",
  "/notes",
  "/people",
  "/offline",
];

export default function PrefetchRoutes() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Wait until SW is ready, then prefetch all core routes
    navigator.serviceWorker.ready.then(() => {
      // Small delay to not compete with initial page load
      setTimeout(() => {
        ROUTES_TO_CACHE.forEach((route) => {
          // Prefetch the HTML (full page navigation cache)
          fetch(route, { credentials: "same-origin" }).catch(() => {});
          // Prefetch the RSC payload (client-side navigation cache)
          fetch(route, {
            credentials: "same-origin",
            headers: { RSC: "1", "Next-Router-Prefetch": "1" },
          }).catch(() => {});
        });
      }, 3000);
    });
  }, []);

  return null;
}
