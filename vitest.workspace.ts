import { defineWorkspace } from "vitest/config";
import path from "node:path";

export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "server",
      include: ["tests/server/**/*.test.ts"],
      environment: "node",
      setupFiles: [path.resolve(__dirname, "tests/server/setup.ts")],
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
      include: ["tests/client/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      setupFiles: [path.resolve(__dirname, "tests/client/setup.ts")],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client/src"),
      },
    },
  },
]);
