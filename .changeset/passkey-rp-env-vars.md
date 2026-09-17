---
"groot": patch
---

Declare RP_NAME/RP_ID/ORIGIN in .env.schema and mark them @public — unblock passkey responses

config.yml resolves the WebAuthn relying party from `{{ env.RP_NAME }}` / `{{ env.RP_ID }}` / `{{ env.ORIGIN }}`, so these vars must be declared (with dev defaults; required in production). They are also marked `@public`: varlock treats every schema item as sensitive by default and patches `ServerResponse.end` to scan for leaked values — but the passkey endpoints intentionally return rpId/rp.name in WebAuthn options (the protocol requires it), so every `/passkey/*/options` response was killed with "DETECTED LEAKED SENSITIVE CONFIG - RP_NAME" once the app ran with the vars set.
