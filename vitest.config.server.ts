import { defineConfig } from "vite-plus";

export default defineConfig({
  // Server test configuration
  root: ".",
  test: {
    include: ["tests/server/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./tests/server/setup.ts"],
  },
  resolve: {
    alias: {
      "@": "./server/src",
    },
  },
});
