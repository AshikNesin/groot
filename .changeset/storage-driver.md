---
"@groot/core": minor
---

Storage adapter is now selected by `STORAGE_DRIVER` (`local` | `s3`, default `local`) instead of branching on `NODE_ENV`. The local filesystem adapter is now valid in every environment, including production single-node deployments; S3 is only loaded when explicitly selected. AWS credentials are no longer marked `@required` in `.env.schema` — they apply only when `STORAGE_DRIVER=s3`.
