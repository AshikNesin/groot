import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const clientSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "client/src");

export default defineConfig({
  // Git hooks configuration
  staged: {
    "*": "vp check --fix",
  },

  // Vite build configuration - build from client directory
  root: "client",
  plugins: [react()],
  resolve: {
    alias: {
      "@": clientSrc,
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        // Vite 8/Rolldown expects manualChunks as a function
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/")
          ) {
            return "react-vendor";
          }
        },
      },
    },
  },
  server: {
    middlewareMode: true,
  },
  publicDir: "./public",

  // Linting configuration
  lint: {
    ignorePatterns: ["dist/**", "node_modules/**"],
  },

  // Formatting configuration
  fmt: {
    semi: true,
    singleQuote: false,
  },

  // Test configuration - client tests only
  // Server tests run from vitest.config.server.ts
  test: {
    include: ["../tests/client/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["../tests/client/setup.ts"],
  },
});
