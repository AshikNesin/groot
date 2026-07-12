import { defineConfig } from "vite-plus";
import path from "node:path";

const rootDir = path.resolve();

export default defineConfig({
  root: ".",
  test: {
    include: ["tests/server/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./tests/server/setup.ts"],
  },
  resolve: {
    alias: {
      "@groot/core": path.resolve(rootDir, "packages/core/src"),
      "@groot/jobs/server": path.resolve(rootDir, "packages/jobs/src/server"),
      "@groot/logger": path.resolve(rootDir, "packages/logger/src"),
    },
  },
});
