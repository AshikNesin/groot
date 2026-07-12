import esbuild from "esbuild";
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

/**
 * Copy static assets from apps/web/src/server/public to dist/public so they
 * ship with the production bundle and can be served via express.static.
 * No-op if the dir doesn't exist.
 */
async function copyPublicAssets() {
  const sourceDir = path.join(process.cwd(), "apps/web/src/server", "public");
  const destDir = path.join(process.cwd(), "dist", "public");

  try {
    await fs.access(sourceDir);
  } catch {
    return; // nothing to copy
  }

  await fs.rm(destDir, { recursive: true, force: true });
  await fs.cp(sourceDir, destDir, { recursive: true });
  console.log("✓ Public assets copied to dist/public");
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
      entryPoints: ["apps/web/src/server/index.ts"],
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
      plugins:
        release && authToken && process.env.SENTRY_ORG
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
          : [],
      alias: {
        "@groot/core": path.resolve(process.cwd(), "packages/core/src"),
        "@groot/jobs/server": path.resolve(process.cwd(), "packages/jobs/src/server"),
      },
      banner: {
        js: 'import { createRequire as __createRequire } from "node:module";const require = __createRequire(import.meta.url);',
      },
      sourcemap: true,
      tsconfig: "tsconfig.json",
      logLevel: "info",
    });

    // The Sentry plugin uploads the source map then deletes it when configured;
    // otherwise drop it here so the original source (which references env names
    // like DATABASE_URL) doesn't sit in a dist/ that express.static may serve
    // (react-doctor/artifact-env-leak). Idempotent — force:true is a no-op once
    // Sentry has already removed it.
    await fs.rm("dist/bundle.js.map", { force: true });

    // Write release.json for runtime release consistency
    if (release) {
      await fs.writeFile("dist/release.json", JSON.stringify({ release }));
    }

    await copyPublicAssets();

    console.log("✓ Build successful: dist/bundle.js created.");
  } catch (error) {
    console.error("Build failed", error);
    process.exit(1);
  }
}

build();
