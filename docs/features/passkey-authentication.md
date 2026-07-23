# Passkey Authentication

Passkey authentication adds passwordless login via WebAuthn (Face ID, Touch ID, Windows Hello, or a hardware security key) on top of the existing password flow.

## Overview

WebAuthn replaces passwords with public-key cryptography and a challenge-response handshake. Users can register any number of passkeys across their devices and sign in with any of them.

## How It Works

### Registration Flow

1. User logs in with password
2. Navigates to Settings or Profile page
3. Uses `<PasskeyManager />` component to add a passkey
4. Browser prompts for biometric authentication or security key
5. System generates a public/private key pair
6. Public key is stored on server, private key remains on device
7. Passkey is immediately available for login

### Authentication Flow

1. User navigates to login page
2. Calls `passkeyService.loginWithPasskey(email)`
3. Browser prompts for biometric authentication or security key
4. System verifies signature using stored public key
5. User is authenticated and logged in

## Setup

### Prerequisites

- HTTPS connection (required for WebAuthn in production)
- Modern browser with WebAuthn support
- Platform authenticator (Face ID, Touch ID, Windows Hello) or security key

### Relying Party Configuration

The Relying Party (RP) settings live under `passkey:` in `config.yml` (see [Config System](../config.md)):

| Key              | Default                     | Description                              |
| ---------------- | --------------------------- | ---------------------------------------- |
| `passkey.rpName` | `"Groot"`                   | Name shown to users during registration  |
| `passkey.rpId`   | `"localhost"`               | Your domain (`"yourdomain.com"` in prod) |
| `passkey.origin` | `"https://groot.localhost"` | Full expected origin of the frontend     |

For production, override them in your environment-specific `config.yml` section (e.g. `production.passkey.rpId`).

### Database Migration

The `User` and `Passkey` models already ship in the Prisma schema. If you change them, generate and apply a migration:

```bash
pnpm db:migrate:create --name add_passkey_model
pnpm prisma migrate dev
```

In production, apply pending migrations with:

```bash
pnpm db:migrate
```

## Usage

### For End Users

#### Registering a Passkey

1. Log in to your account using email and password
2. Navigate to your profile or settings page
3. Use the PasskeyManager component
4. Optionally enter a name for your device
5. Click "Add Passkey"
6. Follow your browser's prompts to authenticate (Face ID, Touch ID, fingerprint, etc.)
7. Your passkey is now registered and ready to use

#### Signing In with a Passkey

```typescript
import { passkeyService } from "@groot/shell/services/passkey";

// Login with passkey
try {
  const { token, user } = await passkeyService.loginWithPasskey("user@example.com");
  // Store token and redirect to dashboard
} catch (error) {
  console.error("Passkey login failed:", error);
}
```

#### Managing Passkeys

```tsx
import { PasskeyManager } from "@groot/shell/components/PasskeyManager";

// In your settings page
<PasskeyManager />;
```

### For Developers

#### Backend API Endpoints

All passkey endpoints are prefixed with `/api/v1/passkey`.

| Method | Path                | Auth     | Description                                     |
| ------ | ------------------- | -------- | ----------------------------------------------- |
| POST   | `/register/options` | required | Generate registration options for a new passkey |
| POST   | `/register/verify`  | required | Verify registration and save the passkey        |
| POST   | `/login/options`    | public   | Generate authentication options for login       |
| POST   | `/login/verify`     | public   | Verify authentication and return a JWT token    |
| GET    | `/list`             | required | List the authenticated user's passkeys          |
| PATCH  | `/:id`              | required | Rename a passkey                                |
| DELETE | `/:id`              | required | Delete a passkey                                |

#### Frontend Integration

**Using the Passkey Service**:

```typescript
import { passkeyService } from "@groot/shell/services/passkey";

// Check if passkeys are supported
const isSupported = await passkeyService.isPlatformAuthenticatorAvailable();

// Register a new passkey
const passkey = await passkeyService.registerPasskey("My iPhone");

// Login with a passkey
const { token, user } = await passkeyService.loginWithPasskey("user@example.com");

// List user's passkeys
const passkeys = await passkeyService.listPasskeys();

// Update passkey name
await passkeyService.updatePasskeyName(passkeyId, "My New Device Name");

// Delete a passkey
await passkeyService.deletePasskey(passkeyId);
```

**Using the PasskeyManager Component**:

```tsx
import { PasskeyManager } from "@groot/shell/components/PasskeyManager";

// In your settings/profile page
export function SettingsPage() {
  return (
    <div>
      <h1>Security Settings</h1>
      <PasskeyManager />
    </div>
  );
}
```

## Security Features

| Feature                      | What it means                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Challenge-response           | Every request uses a one-time, server-stored challenge to block replay attacks |
| Signature counter validation | Each passkey's use counter is checked to detect cloned credentials             |
| Public-key cryptography      | Only public keys are stored server-side; private keys never leave the device   |
| Origin validation            | Requests are checked against `passkey.origin` to prevent phishing              |
| User verification            | Registration and login both require biometric or PIN verification              |

## Browser Support

| Browser     | Minimum version                       |
| ----------- | ------------------------------------- |
| Chrome/Edge | 67+ (desktop), 70+ (Android)          |
| Safari      | 14+ (macOS), 14.5+ (iOS)              |
| Firefox     | 60+ (with `security.webauthn.enable`) |

Check support at runtime with `passkeyService.isPlatformAuthenticatorAvailable()`.

## Troubleshooting

| Symptom                           | Likely cause                                                     | Fix                                                                       |
| --------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Registration fails                | `passkey.rpId`/`passkey.origin` mismatch, or wrong authenticator | Confirm `config.yml` values match the domain; try another authenticator   |
| Login fails with existing passkey | Passkey deleted, device unavailable, or RP config changed        | Re-check `passkey.rpId`/`passkey.origin`; re-register if needed           |
| `NotAllowedError`                 | User cancelled, duplicate registration, or missing user gesture  | Retry from a real click handler; check for an existing registration       |
| "Challenge not found or expired"  | Flow took too long, page was refreshed, or server restarted      | Complete registration/login promptly; see Production Considerations below |

## Production Considerations

**Challenge storage** — Challenges are held in an in-memory store (see the passkey service). This works for a single instance; with multiple server instances or restarts mid-flow, back it with Redis or a DB table with expiration instead.

**HTTPS** — WebAuthn requires HTTPS in production (localhost is exempt). Make sure `passkey.origin` uses `https://` and `passkey.rpId` matches your real domain.

**Fallback** — Keep password login available; passkeys should be additive, not a replacement, so users aren't locked out if they lose all devices.

## Resources

- [WebAuthn Guide](https://webauthn.guide/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [W3C WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [Passkeys.dev](https://passkeys.dev/)
