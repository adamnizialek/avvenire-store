/// <reference types="vitest/config" />
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  server: {
    proxy: {
      // Dev-only: forward `/api` to the live Render backend so the dev server
      // can load real data without running a local backend. The browser talks
      // only to Vite (same origin), so there's no CORS. Paired with
      // VITE_API_URL=/api in .env.development. The production build ignores
      // both. NOTE: writes (login, checkout, admin edits) hit the PRODUCTION
      // database — fine for UI work, careful with mutations.
      "/api": {
        target: "https://avvenire-api.onrender.com",
        changeOrigin: true,
      },
    },
  },
})
