import esbuild from "esbuild";
import alias from "esbuild-plugin-alias";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

async function getExternalDependencies() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
  return Object.keys(packageJson.dependencies || {});
}

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

async function build() {
  try {
    const externals = await getExternalDependencies();
    const release = getSentryRelease();
    const authToken = process.env.SENTRY_AUTH_TOKEN;

    // Ensure SENTRY_RELEASE is set for consistent runtime resolution
    if (release) {
      process.env.SENTRY_RELEASE = release;
    }

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
        ...(release && authToken && process.env.SENTRY_ORG
          ? [
              sentryEsbuildPlugin({
                authToken,
                org: process.env.SENTRY_ORG,
                project: "groot",
                release,
                sourcemaps: {
                  filesToDeleteAfterUpload: ["dist/bundle.js.map"],
                },
              }),
            ]
          : []),
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

    // Write release.json for runtime release consistency
    if (release) {
      await fs.writeFile("dist/release.json", JSON.stringify({ release }));
    }

    console.log("✓ Build successful: dist/bundle.js created.");
  } catch (error) {
    console.error("Build failed", error);
    process.exit(1);
  }
}

build();
