# Deploying to Railway

How to deploy groot to [Railway](https://railway.com) using the nixpacks
builder. The repo ships everything the platform needs:

| File            | Purpose                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| `railway.json`  | Config-as-code: nixpacks builder, `/health` healthcheck, restart policy          |
| `nixpacks.toml` | Pins the nixpkgs archive (Node 24) for reproducible image builds                 |
| `Procfile`      | Start command (`pnpm run postinstall && pnpm start`) if `railway.json` is absent |
| `package.json`  | `engines.node` (24.x) + `packageManager` (pnpm) drive the nixpacks plan          |

## What happens on deploy

1. **Build** — nixpacks installs Node 24 + pnpm from the pinned nixpkgs
   archive, runs `pnpm i --frozen-lockfile`, then `pnpm run build`
   (Prisma generate → Vite client build → esbuild server bundle).
2. **Start** — `pnpm run postinstall && pnpm start`:
   - `postinstall` regenerates the Prisma client for the deployed engine.
   - `prestart` (runs automatically before `start`) executes
     `prisma migrate deploy` — migrations apply on every deploy.
   - `start` boots `dist/bundle.js` with `NODE_ENV=production`.
3. **Healthcheck** — Railway polls `/health` (no auth) for up to 300s.

## One-time setup

1. Create a project, then **New → GitHub Repo** and pick this repo.
   Railway reads `railway.json` automatically.
2. **Add a volume** (Settings → Volumes) mounted at `/app/data` if you use
   the default SQLite engine — the database is a file and must survive
   restarts. Set:

   ```
   DATABASE_URL=file:/app/data/groot.db   # or any path under the mount
   ```

   > Without a volume the SQLite file is lost on every redeploy.

3. **Set required environment variables** (Variables tab). In production
   varlock requires real values (dev placeholders are rejected):

   | Variable                       | Value                                                                                            |
   | ------------------------------ | ------------------------------------------------------------------------------------------------ |
   | `NODE_ENV`                     | `production`                                                                                     |
   | `DATABASE_URL`                 | `file:/app/data/groot.db` (SQLite) or `postgresql://…`                                           |
   | `JWT_SECRET_KEY`               | random string, min 32 chars                                                                      |
   | `ADMIN_AUTH_KEY`               | random string (admin-only routes, `X-Admin-Auth-Key`)                                            |
   | `RP_NAME` / `RP_ID` / `ORIGIN` | passkey relying-party name, domain, and full origin                                              |
   | `AWS_*` + `STORAGE_DRIVER`     | required by env validation even when unused; set dummies unless you use S3 (`STORAGE_DRIVER=s3`) |

   Optionally set `DOPPLER_TOKEN` to pull secrets from Doppler instead.

4. **Deploy.** Railway builds and starts the service, runs migrations,
   boots the job queue (honker on SQLite / pg-boss on Postgres), and
   marks it healthy on the first `/health` 200.

## Notes

- **Single replica only** for SQLite (`numReplicas: 1`, the default):
  honker + better-sqlite3 assume one process per database file.
- **Port** — Railway injects `PORT`; the server listens on it. Don't set it.
- **Domain** — generate a public domain (Settings → Networking) and make
  sure `RP_ID` / `ORIGIN` / CORS origins match it.
- **Postgres instead of SQLite** — attach a Railway Postgres database,
  reference its `DATABASE_URL` variable, and drop the volume. The engine
  is inferred from the URL scheme (`postgresql://` → Postgres + pg-boss).
- **Cron jobs** — schedule via the API (`POST /api/v1/jobs/schedule`);
  schedules persist in the database, so they survive redeploys.
