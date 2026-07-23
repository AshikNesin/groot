import { describe, it, expect } from "vite-plus/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The two engine-specific Prisma schemas (schema.sqlite.prisma and
 * schema.postgres.prisma) must define identical models, fields, types, and
 * relations — only the `datasource.provider` may differ. This keeps the
 * generated PrismaClient type-identical across engines so app code never
 * branches on DATABASE_ENGINE. This test guards against accidental drift.
 */

const SCHEMAS_DIR = resolve(process.cwd(), "apps/web/prisma");

function readSchema(name: string): string {
  return readFileSync(resolve(SCHEMAS_DIR, name), "utf-8");
}

/** Extract the model definitions (everything after the datasource/generator blocks). */
function modelSection(content: string): string {
  // Drop generator + datasource blocks, then keep only model/enum blocks.
  const lines = content.split("\n");
  const kept: string[] = [];
  let inConfigBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(generator|datasource)\s/.test(trimmed)) {
      inConfigBlock = true;
      continue;
    }
    if (inConfigBlock) {
      if (trimmed === "}") inConfigBlock = false;
      continue;
    }
    kept.push(line);
  }
  return stripIgnoredModels(kept.join("\n"))
    .replace(/^\s*\/\/.*$/gm, "") // strip line comments
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

/**
 * Remove `model X { ... }` blocks that carry `@@ignore`. Such models describe
 * runtime-managed infrastructure tables (e.g. keyv, and the honker job-queue
 * tables which are SQLite-only) that are intentionally not Prisma-owned, so
 * they are excluded from the cross-engine parity comparison.
 */
function stripIgnoredModels(text: string): string {
  const out: string[] = [];
  let buffer: string[] = [];
  let inModel = false;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!inModel && /^model\s/.test(trimmed)) {
      inModel = true;
      buffer = [line];
      continue;
    }
    if (inModel) {
      buffer.push(line);
      if (trimmed === "}") {
        const block = buffer.join("\n");
        if (!/@@ignore/.test(block)) out.push(block);
        inModel = false;
        buffer = [];
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

describe("Prisma schema parity (sqlite ↔ postgres)", () => {
  const sqlite = readSchema("schema.sqlite.prisma");
  const postgres = readSchema("schema.postgres.prisma");

  it("both declare the correct engine providers", () => {
    expect(sqlite).toMatch(/provider\s*=\s*"sqlite"/);
    expect(postgres).toMatch(/provider\s*=\s*"postgresql"/);
  });

  it("models, fields, and types are identical across engines", () => {
    const sqliteModels = modelSection(sqlite);
    const postgresModels = modelSection(postgres);
    expect(postgresModels).toBe(sqliteModels);
  });

  it("both use Json (not String[]) for Passkey.transports", () => {
    expect(sqlite).toMatch(/transports\s+Json\b/);
    expect(postgres).toMatch(/transports\s+Json\b/);
  });

  it("both use Json? for JobLog.data", () => {
    expect(sqlite).toMatch(/data\s+Json\?/);
    expect(postgres).toMatch(/data\s+Json\?/);
  });
});
