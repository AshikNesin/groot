# Sentry Source Maps Setup

This guide covers configuring source map uploads so Sentry shows original TypeScript file paths in error stack traces instead of bundled references like `dist/bundle.js:942:12`.

## Prerequisites

- A Sentry account with the `groot` project set up
- Your Sentry organization slug (e.g. `sentry`)
- Your Sentry project slug (e.g. `groot`)

## 1. Create a Sentry Auth Token

There are two ways to create a token:

### Option A: Sentry Web UI (recommended)

1. Log in to Sentry (https://sentry.io or your self-hosted URL)
2. Navigate to token settings:
   - **Organization tokens** (preferred for CI): **Settings > Organization Settings > Developer Settings > Organization Tokens**
   - **Personal tokens**: **Settings > Account Settings > API Keys / User Auth Tokens**
3. Click **Create Auth Token**
4. Set a name (e.g. `groot-source-map-upload`)
5. Select these scopes:
   - `organization:read`
   - `project:write`
   - `release:admin`
6. Click **Create Token**
7. Copy the token — it's only shown once, so store it securely (password manager or CI secret store)

### Option B: Sentry CLI

1. Install Sentry CLI and run:
   ```bash
   sentry-cli login
   ```
2. Open the URL shown in your terminal, sign in, and enter the device code
3. Copy the token from the settings page or `~/.sentryclirc`

### Token types

- **Organization tokens** — bound to a single org, ideal for CI/CD (prefer this for Coolify)
- **Personal tokens** — bound to your user, can access all orgs/projects you have access to

> **Never commit the token to version control.** Rotate it immediately if you suspect a leak.

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

| Plugin                   | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `@sentry/esbuild-plugin` | Uploads server source maps from `dist/bundle.js.map` |
| `@sentry/vite-plugin`    | Uploads client source maps from `dist/assets/*.map`  |

Both plugins only activate when `SENTRY_AUTH_TOKEN` is set. Local builds without the token work normally (plugins are skipped).

A release identifier (`groot@<git-sha>`) is computed during build and written to `dist/release.json`. At runtime, `instrument.ts` reads this file to ensure the release value matches what was uploaded to Sentry.

## Troubleshooting

**Source maps not uploading?**

- Verify `SENTRY_AUTH_TOKEN` is set in the build environment (not just runtime)
- Check the build logs for Sentry-related errors
- Ensure the token has the required scopes (`organization:read`, `project:write`, `release:admin`)

**Stack traces still showing bundled paths?**

- Confirm the release in Sentry matches the release reported by the running app
- Check that `dist/release.json` exists in the deployed artifact
- Source maps may take a few minutes to process after upload
