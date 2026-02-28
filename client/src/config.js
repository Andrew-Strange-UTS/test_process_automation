// client/src/config.js
// Single source of truth for external URLs.
// Set NEXT_PUBLIC_BACKEND_URL / NEXT_PUBLIC_NOVNC_URL in .env (project root)
// or as Docker build-args to override the defaults.

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const WS_URL =
  BACKEND_URL.replace(/^http/, "ws"); // http→ws, https→wss

export const NOVNC_URL =
  process.env.NEXT_PUBLIC_NOVNC_URL || "http://localhost:7900";
