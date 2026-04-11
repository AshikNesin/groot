# Sentry Source Maps Setup

This guide covers configuring source map uploads so Sentry shows original TypeScript file paths in error stack traces instead of bundled references like `dist/bundle.js:942:12`.

## Prerequisites

- A Sentry account with the `groot` project set up
- Your Sentry organization slug (e.g. `sentry`)
- Your Sentry project slug (e.g. `groot`)

## 1. Create a Sentry Auth Token

1. Go to **Sentry > Settings > Auth Tokens** (https://sentry.io/settings/account/api/auth-tokens/)
2. Click **Create New Token**
3. Set a name (e.g. `groot-source-map-upload`)
4. Select these scopes:
   - `org:read`
   - `project:releases`
   - `project:read`
5. Click **Create Token**
6. Copy the token (it won't be shown again)

## 2. Add Token to Coolify

1. Open your Coolify dashboard
2. Navigate to your `groot` application
3. Go to **Configuration > Environment Variables**
4. Add a new variable:
   - **Name:** `SENTRY_AUTH_TOKEN`
   - **Value:** `<paste your token>`
   - Make sure it's available during **build** (not just runtime)
5. Save and redeploy

## 3. Verify It Works

After deploying:

1. Check the build logs — you should see Sentry source map upload messages
2. Go to **Sentry > Releases** — a new release (e.g. `groot@abc1234`) should appear with source map artifacts
3. Trigger an error and check the stack trace — it should show original file paths like `server/src/shared/storage/...` instead of `dist/bundle.js:942:12`

## How It Works

The build pipeline uses two Sentry plugins:

| Plugin | Purpose |
|--------|---------|
| `@sentry/esbuild-plugin` | Uploads server source maps from `dist/bundle.js.map` |
| `@sentry/vite-plugin` | Uploads client source maps from `dist/assets/*.map` |

Both plugins only activate when `SENTRY_AUTH_TOKEN` is set. Local builds without the token work normally (plugins are skipped).

A release identifier (`groot@<git-sha>`) is computed during build and written to `dist/release.json`. At runtime, `instrument.ts` reads this file to ensure the release value matches what was uploaded to Sentry.

## Troubleshooting

**Source maps not uploading?**
- Verify `SENTRY_AUTH_TOKEN` is set in the build environment
- Check the build logs for Sentry-related errors
- Ensure the token has the required scopes

**Stack traces still showing bundled paths?**
- Confirm the release in Sentry matches the release reported by the running app
- Check that `dist/release.json` exists in the deployed artifact
- Source maps may take a few minutes to process after upload
