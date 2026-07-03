/**
 * Shared sync config (`.groot/boilerplate-sync.json`) schema and helpers.
 *
 * The config is the committed, human-readable pointer to the last synced
 * boilerplate commit. The authoritative base *content* for merges lives in the
 * `refs/groot/baseline` git ref (see `baseline.ts`); the config only needs to
 * carry the commit SHA so any machine can rebuild that ref.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const CONFIG_RELATIVE_PATH = ".groot/boilerplate-sync.json";

export const SyncConfigSchema = z.object({
  boilerplate: z.object({
    name: z.string().min(1, "Boilerplate name is required"),
    repo: z.string().url("Invalid repository URL"),
  }),
  last_sync: z.object({
    version: z.string().optional().describe("Semver version tag of last sync (e.g. '1.3.0')"),
    commit: z.string().regex(/^[a-f0-9]{7,40}$/, "Invalid commit SHA"),
    date: z.string(),
  }),
  additional_exclusions: z
    .array(z.string())
    .default([])
    .describe(
      "Project-specific patterns to exclude from sync (e.g., custom components, experimental features)",
    ),
});

export type SyncConfig = z.infer<typeof SyncConfigSchema>;

export function configPath(projectRoot: string): string {
  return join(projectRoot, CONFIG_RELATIVE_PATH);
}

export async function loadConfig(projectRoot: string): Promise<SyncConfig> {
  const path = configPath(projectRoot);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path, "utf-8"));
  } catch {
    throw new Error(`Config not found or unreadable at ${path}. Is this a groot-synced project?`);
  }
  return SyncConfigSchema.parse(raw);
}

export async function saveConfig(projectRoot: string, config: SyncConfig): Promise<void> {
  await writeFile(configPath(projectRoot), JSON.stringify(config, null, 2) + "\n");
}
