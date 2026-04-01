import { defineConfig } from "prisma/config";
import { ENV } from "varlock/env";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: ENV.DATABASE_URL,
  },
});
