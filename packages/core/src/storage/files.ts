import { Files } from "files-sdk";
import { fs } from "files-sdk/fs";
import { env } from "@groot/core/env";

/**
 * Storage core: one configured {@link Files} instance for the whole app.
 *
 * The adapter is chosen by environment so every call site stays identical
 * between local and remote — that is the whole point of the files-sdk
 * Adapter contract.
 *
 * - **Non-production** (development / test) → the local `fs` adapter. Bodies
 *   land under `./local/uploads` with a sidecar `.meta.json` per file.
 *   Not for production: no replication, no signing, no auth.
 * - **Production** → the `s3` adapter, scoped to `AWS_DEFAULT_S3_BUCKET`.
 *   Credentials are auto-loaded from the AWS chain (env vars, IAM role,
 *   shared profile), so no secrets are wired here.
 *
 * The S3 adapter (files-sdk/s3) is imported dynamically in production only.
 * This prevents the three `@aws-sdk/*` packages from being loaded into memory
 * in development and test, where S3 is never used.
 *
 * Depend on this instance and the files-sdk method signatures — `upload`,
 * `download`, `head`, `exists`, `delete`, `copy`, `move`, `list`, `listAll`,
 * `url`, `signedUploadUrl`, `file`. See https://files-sdk.dev/api.
 */
async function createFiles(): Promise<Files> {
  if (env.NODE_ENV !== "production") {
    return new Files({
      adapter: fs({ root: "./local/uploads" }),
    });
  }

  // Dynamic import keeps @aws-sdk/* out of the dev/test module graph entirely.
  const { s3 } = await import("files-sdk/s3");
  return new Files({
    adapter: s3({
      bucket: env.AWS_DEFAULT_S3_BUCKET,
      region: env.AWS_REGION,
      // Credentials auto-loaded from the AWS chain.
    }),
  });
}

// Resolved at module load. The resolved instance is cached in `_files` so the
// synchronous `files` proxy (used by storageService) works for every call after
// the first `await`-tick of the event loop — i.e. well before the first HTTP
// request lands. Callers that need the instance before that tick (e.g. during
// imperative startup) should `await getFiles()` / `await filesPromise`.
let _files: Files | null = null;
export const filesPromise: Promise<Files> = createFiles().then((instance) => {
  _files = instance;
  return instance;
});

// Lazy accessor used by storageService — awaits the promise on first call then
// returns the cached instance for all subsequent calls.
export const getFiles = async (): Promise<Files> => {
  if (!_files) _files = await filesPromise;
  return _files;
};

// Synchronous accessor for call-sites that run after startup. Throws if called
// before createFiles() has resolved (should never happen in practice).
export const files = new Proxy({} as Files, {
  get(_target, prop) {
    if (!_files) {
      throw new Error(
        `Storage not ready yet — files.${String(prop)} called before createFiles() resolved.`,
      );
    }
    const value = Reflect.get(_files as object, prop, _files);
    return typeof value === "function" ? (value as Function).bind(_files) : value;
  },
});
