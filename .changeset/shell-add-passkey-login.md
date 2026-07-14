---
"@groot/shell": minor
---

Add `loginWithPasskey` to the shell auth store

`useAuthStore` now exposes `loginWithPasskey(email?)`, which runs the WebAuthn
ceremony via the existing `passkeyService.loginWithPasskey` and — on success —
sets `isAuthenticated`/`user` and bumps `generation`, mirroring password login.

Previously apps that wanted passkey login had to fork the store and track a
separate `username` field. Now any app can `<PasskeyManager>` + call
`loginWithPasskey` directly from `@groot/shell/store/auth`, keeping a single
auth store. No change to existing fields or behavior.
