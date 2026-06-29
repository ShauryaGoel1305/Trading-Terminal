import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Express proxy runs on PORT (default 3001). Vite proxies /api to it so
// the browser never makes cross-origin requests during development.
const API_PORT = process.env.PORT ?? "3001";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
