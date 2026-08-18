import esbuild from "esbuild";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  if (sourceVersion) return `${pkgName}@${sourceVersion.slice(0, 7)}`;
  try {
    const sha = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    return `${pkgName}@${sha.slice(0, 7)}`;
  } catch {
    return undefined;
  }
}

// App name used for Sentry release tags. Derived from package.json so child
// repos that use a different project don't need to fork this script.
const pkgName = JSON.parse(readFileSync("package.json", "utf-8")).name;

/**
 * The generated Prisma client is bundled into dist/bundle.js, so the database
 * engine is baked in at build time. If the build environment has a different
 * DATABASE_URL scheme than the runtime one, the driver adapter and the bundled
 * client disagree and the server crashes on boot ("The Driver Adapter
 * `@prisma/adapter-pg` ... is not compatible with the provider `sqlite`").
 * Fail the build instead so the mismatch surfaces here rather than in
 * production. The check is engine-agnostic: it compares the engine inferred
 * from DATABASE_URL against the bundled client's activeProvider, so it works
 * for both sqlite and postgres builds.
 */
async function assertBundledEngine() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const isPostgres = dbUrl.trim().startsWith("postgres");
  const expected = isPostgres ? "postgresql" : "sqlite";
  const bundle = await fs.readFile("dist/bundle.js", "utf-8");
  const match = bundle.match(/"activeProvider":\s*"(\w+)"/);

  if (!match) {
    throw new Error("Could not find the bundled Prisma activeProvider in dist/bundle.js.");
  }
  if (match[1] !== expected) {
    throw new Error(
      `Bundled Prisma client targets "${match[1]}" but DATABASE_URL="${dbUrl}" expects ` +
        `"${expected}". Run 'prisma generate' with the same DATABASE_URL as the build.`,
    );
  }
  console.log(`✓ Bundled Prisma client matches DATABASE_URL (${dbUrl || "<empty>"} → ${expected})`);
}

/**
 * Copy static assets from apps/web/public (Vite's publicDir) to dist/public so
 * they ship with the production bundle and can be served via express.static.
 * No-op (with a warning) if the dir doesn't exist.
 */
async function copyPublicAssets() {
  const sourceDir = path.join(process.cwd(), "apps/web", "public");
  const destDir = path.join(process.cwd(), "dist", "public");

  try {
    await fs.access(sourceDir);
  } catch {
    console.warn(`Warning: Public directory not found at ${sourceDir}. Skipping copy.`);
    return;
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
        "vite-plus",
        "@vitejs/plugin-react",
        "lightningcss",
        "fsevents",
        // Native modules + their optional platform packages cannot be bundled
        // (esbuild has no ".node" loader). Keep them as runtime requires.
        "better-sqlite3",
        "sqlite3",
        "pg",
        "@russellthehippo/honker-node",
        "@russellthehippo/honker-node-linux-x64-gnu",
        "@russellthehippo/honker-node-linux-arm64-gnu",
        "@russellthehippo/honker-node-darwin-x64",
        "@russellthehippo/honker-node-darwin-arm64",
        "@russellthehippo/honker-node-win32-x64-msvc",
      ],
      plugins:
        release && authToken && process.env.SENTRY_ORG
          ? [
              sentryEsbuildPlugin({
                authToken,
                org: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT ?? "groot",
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

    await assertBundledEngine();

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
