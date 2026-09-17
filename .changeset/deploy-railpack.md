---
"groot": minor
---

Switch the default deploy pipeline from nixpacks to railpack (Railway config-as-code) and make AWS\_\* env vars conditional

The repo now deploys through railpack (`railpack.json`, `railway.json`) instead of nixpacks (`nixpacks.toml` removed), with `docs/guides/deploy.md` documenting the Railway flow. `AWS_*` vars in `.env.schema` are now `@required=eq($STORAGE_DRIVER, s3)` — they apply only when the S3 driver is selected, so local-driver setups no longer fail env validation for missing S3 credentials. The railpack runtime image also installs `libsqlite3-0` so the SQLite build boots on Railway.
