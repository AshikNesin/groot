import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const clientRoot = path.resolve(__dirname, "client");

export default defineConfig({
  root: clientRoot,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(clientRoot, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  server: {
    middlewareMode: true,
  },
  publicDir: path.resolve(clientRoot, "public"),
});
