import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/framer-motion")
          ) {
            return "vendor";
          }
          if (
            id.includes("node_modules/mermaid") ||
            id.includes("node_modules/cytoscape") ||
            id.includes("node_modules/d3") ||
            id.includes("node_modules/dagre")
          ) {
            return "visualizations";
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["host.docker.internal", "localhost"],
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        target: process.env.DEVELOPMENT_BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
});
