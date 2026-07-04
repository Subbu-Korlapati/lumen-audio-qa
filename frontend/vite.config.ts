import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development we proxy the API routes to the Flask backend so the browser
// talks to a single origin (no CORS changes needed on the backend).
// Default is :8000 because macOS + Cursor commonly occupy :5000; override with
// VITE_BACKEND_URL for docker / other setups.
const backendUrl = process.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/ask": { target: backendUrl, changeOrigin: true },
      "/health": { target: backendUrl, changeOrigin: true },
    },
  },
});
