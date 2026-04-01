# Portless & HTTPS Setup

This project uses [portless](https://github.com/vercel-labs/portless) to replace port numbers with stable, named `.localhost` URLs during local development. HTTPS with HTTP/2 is enabled by default.

When you run `pnpm dev`, the dev script uses portless:

```bash
# What pnpm dev runs under the hood:
NODE_ENV=development portless run --name $npm_package_name varlock run -- tsx scripts/dev.ts
# → Your app is available at https://groot.localhost
```

---

## 1. Install Portless (One-Time)

Portless must be installed **globally**. Do not add it as a project dependency.

```bash
npm install -g portless
```

> [!WARNING]
> Do **not** use `npx` or add portless to `package.json`. It needs to bind to privileged ports (443/80) and manage a system-level CA certificate.

Verify the installation:

```bash
portless --version
```

---

## 2. Trust the Certificate (First Run)

On your **first `pnpm dev`**, portless will:

1. Generate a local Certificate Authority (CA)
2. Prompt you to trust it in your system keychain (requires `sudo` on macOS/Linux)
3. Bind to port 443 for HTTPS (auto-elevates with `sudo`)

**You'll see a sudo prompt** — this is expected. Enter your password to allow portless to:

- Add the CA certificate to your system trust store
- Bind to port 443

After trusting, browsers will show a green lock with no warnings on `https://*.localhost`.

### If You Skipped the Trust Prompt

If you dismissed the prompt or it failed, manually trust the CA:

```bash
portless trust
```

This adds the portless-generated CA to your system trust store.

### Platform Notes

| Platform                  | How trust works                                   |
| ------------------------- | ------------------------------------------------- |
| **macOS**                 | Adds CA to the system Keychain via `security` CLI |
| **Linux (Debian/Ubuntu)** | Uses `update-ca-certificates`                     |
| **Linux (Arch)**          | Uses `update-ca-trust`                            |
| **Linux (Fedora/RHEL)**   | Uses `update-ca-trust`                            |
| **Windows**               | Uses `certutil` to add to system trust store      |

---

## 3. Verify It Works

```bash
pnpm dev
```

You should see output indicating your app is running at `https://groot.localhost` (the name comes from `package.json` → `name` field).

Open `https://groot.localhost` in your browser — it should load with a valid HTTPS certificate (green lock, no warnings).

---

## 4. How It Works with This Project

### Dev Script

The `pnpm dev` script wraps the dev server through portless:

```
portless run --name groot varlock run -- tsx scripts/dev.ts
```

Portless:

1. Auto-starts the HTTPS proxy daemon (port 443)
2. Assigns a random ephemeral port (4000–4999) to the app via the `PORT` env var
3. Registers the app name `groot` with the proxy
4. Routes `https://groot.localhost` → `localhost:<ephemeral-port>`

### Vite HMR Integration

The `vite.config.ts` automatically configures Hot Module Replacement (HMR) to work over the portless HTTPS URL using the `PORTLESS_URL` environment variable that portless injects:

- WebSocket protocol: `wss://` (secure WebSocket)
- Host: `groot.localhost`
- Port: `443`

No manual HMR configuration needed.

### Passkey (WebAuthn) Integration

If you use passkey authentication, update your `.env` to match the portless URL:

```env
RP_ID=groot.localhost
RP_ORIGIN=https://groot.localhost
```

> [!IMPORTANT]
> WebAuthn requires HTTPS in non-localhost origins. Portless provides this automatically for `.localhost` subdomains.

---

## 5. Troubleshooting

### Browser shows certificate warning

The local CA isn't trusted. Run:

```bash
portless trust
```

Then restart your browser (some browsers cache certificate state).

### "Address already in use" on port 443

Another process is using port 443. Check what's running:

```bash
sudo lsof -i :443
```

Stop the conflicting process, or stop the existing portless proxy:

```bash
portless proxy stop
```

### Safari can't find your `.localhost` URL

Safari sometimes doesn't resolve `.localhost` subdomains. Fix with:

```bash
portless hosts sync
```

This adds entries to `/etc/hosts`. Clean up later with:

```bash
portless hosts clean
```

### Disable portless temporarily

Bypass portless using the `PORTLESS=0` environment variable:

```bash
PORTLESS=0 pnpm dev
# → https://groot.localhost (plain HTTP, no portless needed)
```

### Check active routes

```bash
portless list
```

### Stop the proxy daemon

```bash
portless proxy stop
```

---

## 6. Using Custom Certs (Optional)

If you already have certificates from `mkcert` or another tool:

```bash
portless proxy start --cert ./cert.pem --key ./key.pem
```

### Disable HTTPS Entirely

```bash
portless proxy start --no-tls
# App will be available at http://groot.localhost (port 80)
```

Or via environment variable:

```bash
PORTLESS_HTTPS=0 pnpm dev
```

---

## Quick Reference

| Command                   | Description                                 |
| ------------------------- | ------------------------------------------- |
| `npm install -g portless` | Install portless globally                   |
| `portless trust`          | Add local CA to system trust store          |
| `portless list`           | Show active routes                          |
| `portless proxy stop`     | Stop the HTTPS proxy daemon                 |
| `portless hosts sync`     | Fix Safari DNS resolution                   |
| `portless hosts clean`    | Remove portless entries from `/etc/hosts`   |
| `PORTLESS=0 pnpm dev`     | Bypass portless, use plain `localhost:3000` |
