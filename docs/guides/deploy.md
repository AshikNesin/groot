# Deploying with Railpack

How to deploy groot using [Railpack](https://railpack.com) — the build pack
used by Coolify (≥ 4.3.1, beta) and Railway. Railpack analyzes the repo and
generates the build plan automatically; no config file is required.

## Zero-config detection

Running `railpack info` against the repo yields:

```
↳ Detected Node
↳ Using pnpm package manager
↳ Found workspace with 7 packages
↳ Found web command in Procfile

Packages
  node  │  24.x      │ package.json > engines > node
  pnpm  │  10.32.1   │ package.json > packageManager

Steps
  install │ pnpm add -g node-gyp
          │ pnpm install --frozen-lockfile --prefer-offline
  build   │ pnpm run build

Deploy
  pnpm run postinstall && pnpm start
```

| Signal            | Source                                                 |
| ----------------- | ------------------------------------------------------ |
| Runtime + version | `package.json` → `engines.node` (24.x)                 |
| Package manager   | `package.json` → `packageManager` (pnpm@10.x)          |
| Install           | lockfile (`pnpm install --frozen-lockfile`)            |
| Build             | `package.json` → `scripts.build`                       |
| Start             | `Procfile` → `web: pnpm run postinstall && pnpm start` |

## Optional: explicit `railpack.json`

Railpack reads an optional `railpack.json` to override the detected plan.
The minimum useful one pins the start command (Procfile already provides
it — this file is mainly a hook for future customisation):

```json
{
  "$schema": "https://schema.railpack.com",
  "deploy": {
    "startCommand": "pnpm run postinstall && pnpm start"
  }
}
```

## What happens on deploy

1. **Build** — Railpack provisions Node 24 + pnpm via mise, runs
   `pnpm install --frozen-lockfile`, then `pnpm run build`
   (Prisma generate → Vite client build → esbuild server bundle).
2. **Start** — `pnpm run postinstall && pnpm start`:
   - `postinstall` regenerates the Prisma client for the deployed engine.
   - `prestart` (runs automatically before `start`) executes
     `prisma migrate deploy` — migrations apply on every deploy.
   - `start` boots `dist/bundle.js` with `NODE_ENV=production`.
3. Health — the app exposes `/health` (no auth). Point your platform's
   healthcheck at it.

## Coolify (≥ 4.3.1)

1. **+ New Resource → Application** → pick your Git repo.
2. **Build Pack → Railpack** (beta). Everything else is auto-detected.
3. **Persistent Storage** — add a volume mounted at `/app/data` if you use
   the default SQLite engine — the database is a file and must survive
   restarts. Set:

   ```
   DATABASE_URL=file:/app/data/groot.db   # or any path under the mount
   ```

   > Without a volume the SQLite file is lost on every redeploy.

4. **Environment variables** (Environment tab). In production varlock
   requires real values (dev placeholders are rejected):

   | Variable                       | Value                                                                                            |
   | ------------------------------ | ------------------------------------------------------------------------------------------------ |
   | `NODE_ENV`                     | `production`                                                                                     |
   | `DATABASE_URL`                 | `file:/app/data/groot.db` (SQLite) or `postgresql://…`                                           |
   | `JWT_SECRET_KEY`               | random string, min 32 chars                                                                      |
   | `ADMIN_AUTH_KEY`               | random string (admin-only routes, `X-Admin-Auth-Key`)                                            |
   | `RP_NAME` / `RP_ID` / `ORIGIN` | passkey relying-party name, domain, and full origin                                              |
   | `AWS_*` + `STORAGE_DRIVER`     | required by env validation even when unused; set dummies unless you use S3 (`STORAGE_DRIVER=s3`) |

   Optionally set `DOPPLER_TOKEN` to pull secrets from Doppler instead.

5. **Deploy.** Migrations run, the job queue boots (honker on SQLite /
   pg-boss on Postgres), and the app serves once healthy.

## Notes

- **Single replica only** for SQLite: honker + better-sqlite3 assume one
  process per database file. Scale horizontally only on Postgres.
- **Port** — the platform injects `PORT`; the server listens on it. Don't set it.
- **Domain** — attach your domain and make sure `RP_ID` / `ORIGIN` / CORS
  origins match it.
- **Postgres instead of SQLite** — attach a Postgres service and reference
  its `DATABASE_URL`; the engine is inferred from the URL scheme
  (`postgresql://` → Postgres + pg-boss). No volume needed.
- **Cron jobs** — schedule via the API (`POST /api/v1/jobs/schedule`);
  schedules persist in the database, so they survive redeploys.
