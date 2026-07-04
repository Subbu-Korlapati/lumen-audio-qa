/**
 * Central runtime configuration for the frontend.
 *
 * In development, VITE_API_BASE_URL is normally left empty so requests go to the
 * same origin and are forwarded to the backend by the Vite dev proxy (see
 * vite.config.ts). In other setups (e.g. a deployed backend on another host),
 * set VITE_API_BASE_URL to that origin.
 */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL ?? ""
).replace(/\/$/, "");

/** Endpoint paths exposed by the Flask backend. */
export const ENDPOINTS = {
  ask: "/ask",
  health: "/health",
} as const;

/** Abort a request if the backend takes longer than this (ms). */
export const REQUEST_TIMEOUT_MS = 60_000;
