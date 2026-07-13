import { Files } from "files-sdk";
import { fs } from "files-sdk/fs";
import { s3 } from "files-sdk/s3";
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
 * Depend on this instance and the files-sdk method signatures — `upload`,
 * `download`, `head`, `exists`, `delete`, `copy`, `move`, `list`, `listAll`,
 * `url`, `signedUploadUrl`, `file`. See https://files-sdk.dev/api.
 */
function createFiles(): Files {
  if (env.NODE_ENV !== "production") {
    return new Files({
      adapter: fs({ root: "./local/uploads" }),
    });
  }

  return new Files({
    adapter: s3({
      bucket: env.AWS_DEFAULT_S3_BUCKET,
      region: env.AWS_REGION,
      // Credentials auto-loaded from the AWS chain.
    }),
  });
}

export const files = createFiles();
