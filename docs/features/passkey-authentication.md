# Passkey Authentication

Passkey authentication provides secure, passwordless login using biometric authentication (Face ID, Touch ID, Windows Hello) or hardware security keys.

## Overview

Passkey authentication uses the WebAuthn standard to provide a more secure and user-friendly alternative to traditional password-based authentication. Users can register multiple passkeys on different devices and use any of them to sign in.

### Key Features

- **Passwordless Authentication** - Sign in using biometrics or device PINs
- **Multiple Passkeys** - Users can register unlimited passkeys across different devices
- **Enhanced Security** - Uses public-key cryptography and challenge-response authentication
- **Cross-Device Support** - Works with platform authenticators (Face ID, Touch ID, Windows Hello) and security keys (YubiKey, etc.)
- **Backup Detection** - Automatically detects and reports backed-up credentials
- **User-Friendly Management** - Easily add, rename, and delete passkeys

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

### Environment Variables

Add these environment variables to configure the Relying Party (RP):

```bash
# Relying Party Name (shown to users during registration)
RP_NAME="Groot"

# Relying Party ID (your domain)
# For localhost development: "localhost"
# For production: "yourdomain.com"
RP_ID="localhost"

# Expected origin (full URL of your frontend)
# For development: "http://localhost:3000"
# For production: "https://yourdomain.com"
ORIGIN="http://localhost:3000"
```

**Note**: These are already defined in `.env.example` with defaults suitable for development.

### Database Migration

The User and Passkey models are already in your Prisma schema. Run migration:

```bash
npx prisma migrate dev --name add_passkey_model
```

Or push the schema to your database:

```bash
npx prisma db push
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
import { passkeyService } from "@/services/passkey";

// Login with passkey
try {
  const { token, user } = await passkeyService.loginWithPasskey("user@example.com");
  // Store token and redirect to dashboard
} catch (error) {
  console.error("Passkey login failed:", error);
}
```

#### Managing Passkeys

```typescript
import { PasskeyManager } from '@/components/PasskeyManager';

// In your settings page
<PasskeyManager />
```

### For Developers

#### Backend API Endpoints

All passkey endpoints are prefixed with `/api/v1/passkey`:

**Registration Endpoints** (requires authentication):

- `POST /register/options` - Generate registration options for creating a new passkey
- `POST /register/verify` - Verify registration response and save the passkey

**Authentication Endpoints** (public):

- `POST /login/options` - Generate authentication options for passkey login
- `POST /login/verify` - Verify authentication response and return JWT token

**Management Endpoints** (requires authentication):

- `GET /list` - List all passkeys for the authenticated user
- `PATCH /:id` - Update a passkey's name
- `DELETE /:id` - Delete a passkey

#### Frontend Integration

**Using the Passkey Service**:

```typescript
import { passkeyService } from "@/services/passkey";

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
import { PasskeyManager } from "@/components/PasskeyManager";

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

### Challenge-Response Authentication

Every authentication request uses a unique challenge to prevent replay attacks. The challenge is stored server-side and validated only once.

### Signature Counter Validation

Each passkey maintains a signature counter that increments with each use. The server validates this counter to detect cloned credentials.

### Public-Key Cryptography

Private keys never leave the user's device. Only public keys are stored on the server, making credential theft ineffective.

### Origin Validation

The system validates that authentication requests come from the expected origin (domain), preventing phishing attacks.

### User Verification

The system requires user verification (biometric or PIN) during both registration and authentication.

## Browser Support

Passkey authentication is supported in:

- **Chrome/Edge**: 67+ (desktop), 70+ (Android)
- **Safari**: 14+ (macOS), 14.5+ (iOS)
- **Firefox**: 60+ (with security.webauthn.enable enabled)

The system automatically detects support using `passkeyService.isPlatformAuthenticatorAvailable()`.

## Troubleshooting

### Registration Fails

**Issue**: Unable to register a new passkey.

**Solutions**:

1. Check browser console for errors
2. Ensure RP_ID matches your domain (or "localhost" for development)
3. Verify ORIGIN environment variable is set correctly
4. Try a different authenticator (security key vs. platform authenticator)

### Authentication Fails

**Issue**: Can't log in with an existing passkey.

**Solutions**:

1. Ensure the passkey hasn't been deleted
2. Check that the device/authenticator is still available
3. Verify RP_ID and ORIGIN haven't changed
4. Try deleting and re-registering the passkey

### "NotAllowedError"

**Issue**: Browser shows "NotAllowedError" or operation was cancelled.

**Solutions**:

1. User may have cancelled the operation - try again
2. Check if passkey is already registered (duplicate registration)
3. Ensure user gesture (button click) initiated the request
4. For platform authenticators, check device biometric settings

### Challenge Not Found Error

**Issue**: Server returns "Challenge not found or expired".

**Solutions**:

1. Complete the registration/authentication within a reasonable time
2. Don't refresh the page during the process
3. In production, consider using Redis for challenge storage instead of in-memory

## Production Considerations

### Challenge Storage

The current implementation uses in-memory storage for challenges. For production with multiple server instances:

1. **Use Redis**:

```typescript
// Example using Redis
import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL);

// Store challenge
await redis.setex(`passkey:challenge:${userId}`, 300, challenge); // 5 min expiry

// Retrieve challenge
const challenge = await redis.get(`passkey:challenge:${userId}`);
```

2. **Use Database**: Store challenges in a dedicated table with expiration

### HTTPS Requirement

WebAuthn requires HTTPS in production (except localhost). Ensure:

- SSL certificate is valid
- ORIGIN environment variable uses `https://`
- RP_ID matches your domain

### Domain Configuration

For production deployment:

```bash
# Production environment variables
RP_NAME="Your App Name"
RP_ID="yourdomain.com"
ORIGIN="https://yourdomain.com"
```

### Monitoring

Monitor these metrics:

- Passkey registration success/failure rates
- Authentication success/failure rates
- Challenge expiration rates
- Counter validation failures (potential cloning attempts)

### Backup Authentication

Always maintain password-based authentication as a backup:

- Users who lose their devices can still access accounts
- Provides fallback for unsupported browsers
- Allows account recovery

## Best Practices

### For Users

1. **Register multiple passkeys** - Add passkeys on multiple devices for redundancy
2. **Use descriptive names** - Name passkeys like "Work MacBook" or "Personal iPhone"
3. **Keep backups** - If using iCloud Keychain or similar, ensure backups are enabled
4. **Don't delete last passkey** - Keep at least one passkey or ensure password still works

### For Developers

1. **Graceful degradation** - Always show password login as fallback
2. **Clear error messages** - Provide helpful guidance when operations fail
3. **Test cross-browser** - Verify functionality in all major browsers
4. **Monitor usage** - Track passkey adoption and authentication success rates
5. **Update dependencies** - Keep @simplewebauthn packages up to date

## Resources

- [WebAuthn Guide](https://webauthn.guide/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [W3C WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [Passkeys.dev](https://passkeys.dev/)

## API Reference

See the comprehensive API reference with request/response examples in the source code comments or generate API documentation using your preferred tool.
