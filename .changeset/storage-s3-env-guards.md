---
"@groot/core": patch
---

Guard optional S3 env vars in the storage adapter and typecheck fixes

`packages/core/src/storage/files.ts` now throws a clear error when `STORAGE_DRIVER=s3` but `AWS_DEFAULT_S3_BUCKET` is unset (the vars are optional in env.d.ts, so this previously failed later with a confusing adapter error), and defaults `AWS_REGION` to `us-east-1` when unset. Also: `dialog.tsx` outside-click handlers typecheck cleanly, and `railpack.json` + `config.example.yml` are now part of the boilerplate sync patterns (the live `config.yml` stays project-owned).
