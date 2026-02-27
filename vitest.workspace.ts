import { defineWorkspace } from "vitest/config";
import path from "node:path";

export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "server",
      include: ["server/src/**/*.test.ts"],
      environment: "node",
      setupFiles: [path.resolve(__dirname, "server/src/test/setup.ts")],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "server/src"),
      },
    },
  },
  {
    extends: "./vitest.config.ts",
    test: {
      name: "client",
      include: ["client/src/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      setupFiles: [path.resolve(__dirname, "client/src/test/setup.ts")],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client/src"),
      },
    },
  },
]);
