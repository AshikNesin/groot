import esbuild from "esbuild";
import alias from "esbuild-plugin-alias";
import fs from "node:fs/promises";
import path from "node:path";

async function getExternalDependencies() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
  return Object.keys(packageJson.dependencies || {});
}

const generatedPrismaExternalPlugin = {
  name: "generated-prisma-external",
  setup(build) {
    build.onResolve({ filter: /^@\/generated\/prisma/ }, (args) => {
      let relativePath = args.path.replace(
        /^@\/generated\/prisma/,
        "../server/src/generated/prisma",
      );
      if (relativePath === "../server/src/generated/prisma") {
        relativePath = "../server/src/generated/prisma/index.js";
      }
      return { path: relativePath, external: true };
    });
  },
};

async function build() {
  try {
    const externals = await getExternalDependencies();

    await esbuild.build({
      entryPoints: ["server/src/index.ts"],
      outfile: "dist/bundle.js",
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node18",
      external: [
        ...externals,
        "@prisma/client",
        ".prisma/client",
        "@sentry/profiling-node",
        "vite",
        "lightningcss",
        "fsevents",
      ],
      plugins: [
        generatedPrismaExternalPlugin,
        alias({
          "@": path.resolve(process.cwd(), "server/src"),
        }),
      ],
      banner: {
        js: 'import { createRequire } from "module";const require = createRequire(import.meta.url);',
      },
      sourcemap: true,
      tsconfig: "tsconfig.json",
      logLevel: "info",
    });

    console.log("✓ Build successful: dist/bundle.js created.");
  } catch (error) {
    console.error("Build failed", error);
    process.exit(1);
  }
}

build();
