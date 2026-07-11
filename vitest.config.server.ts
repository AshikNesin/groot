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
      "@groot/server/core": path.resolve(rootDir, "packages/server/src/core"),
      "@groot/server/shared": path.resolve(rootDir, "packages/server/src/shared"),
      "@groot/jobs/backend": path.resolve(rootDir, "packages/jobs/src/backend"),
      "@groot/database": path.resolve(rootDir, "packages/database/src/index.ts"),
    },
  },
});
