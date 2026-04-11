import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const clientSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "client/src");

function getSentryRelease() {
  if (process.env.SENTRY_RELEASE) return process.env.SENTRY_RELEASE;
  const sourceVersion = process.env.SOURCE_COMMIT || process.env.SOURCE_VERSION;
  if (sourceVersion) return `groot@${sourceVersion.slice(0, 7)}`;
  try {
    const sha = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    return `groot@${sha.slice(0, 7)}`;
  } catch {
    return undefined;
  }
}

const release = getSentryRelease();
const authToken = process.env.SENTRY_AUTH_TOKEN;

export default defineConfig({
  // Git hooks configuration
  staged: {
    "*": "vp check --fix",
  },

  // Vite build configuration - build from client directory
  root: "client",
  plugins: [
    react(),
    ...(release && authToken && process.env.SENTRY_ORG
      ? [
          sentryVitePlugin({
            authToken,
            org: process.env.SENTRY_ORG,
            project: "groot",
            sourcemaps: {
              filesToDeleteAfterUpload: ["dist/assets/*.map"],
            },
          }),
        ]
      : []),
  ],
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
    allowedHosts: process.env.PORTLESS_URL
      ? true
      : process.env.VITE_HMR_URL
        ? [process.env.VITE_HMR_URL]
        : undefined,
    hmr: process.env.VITE_HMR_URL
      ? {
          protocol: "wss",
          host: process.env.VITE_HMR_URL,
          clientPort: 443,
        }
      : process.env.PORTLESS_URL
        ? (() => {
            try {
              const url = new URL(process.env.PORTLESS_URL);
              return {
                protocol: url.protocol === "https:" ? "wss" : "ws",
                host: url.hostname,
                clientPort: url.port
                  ? parseInt(url.port, 10)
                  : url.protocol === "https:"
                    ? 443
                    : 80,
              };
            } catch (e) {
              return undefined;
            }
          })()
        : undefined,
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
    alias: {
      "@": clientSrc,
    },
  },
});
