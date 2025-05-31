import esbuild from "esbuild";
import fs from "fs/promises"; // For reading package.json
import path from "path"; // For path joining

// Function to get production dependencies from package.json
async function getExternalDependencies() {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    // Also consider express if it's mistakenly in devDependencies
    const externals = Object.keys(packageJson.dependencies || {});
    if (packageJson.devDependencies && packageJson.devDependencies.express) {
      if (!externals.includes("express")) {
        externals.push("express");
      }
    }
    console.log("Identified external dependencies:", externals);
    return externals;
  } catch (error) {
    console.error(
      "Failed to read or parse package.json for external dependencies:",
      error
    );
    // Fallback or re-throw, depending on desired strictness
    // For now, let's provide a common list and log the error.
    // This fallback is important if the script cannot find package.json during execution in some CI environments.
    const fallbackExternals = [
      "express",
      "@t3-oss/env-core",
      "cors",
      "dotenv",
      "express-basic-auth",
      "zod",
      "@prisma/client",
      ".prisma/client",
    ];
    console.warn("Using fallback external dependencies:", fallbackExternals);
    return fallbackExternals;
  }
}

async function build() {
  const externalDependencies = await getExternalDependencies();

  try {
    await esbuild.build({
      entryPoints: ["src/index.ts"],
      outfile: "dist/bundle.js",
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node18",
      external: [...externalDependencies, "@prisma/client", ".prisma/client"],
      banner: {
        js: 'import { createRequire } from "module";const require = createRequire(import.meta.url);',
      },
      sourcemap: true,
      tsconfig: "tsconfig.json", // Point to tsconfig to respect paths and other settings
      define: {
        __dirname: "import.meta.url",
        __filename: "import.meta.url",
      },
      mainFields: ["module", "main"], // Prioritize ESM fields
    });
    console.log("Build successful: dist/bundle.js created.");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();
