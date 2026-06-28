---
"groot": minor
---

Rename admin auth header from `X-Admin-Auth` to `X-Admin-Auth-Key`

The middleware now reads the `X-Admin-Auth-Key` header instead of
`X-Admin-Auth`. The `-Key` suffix disambiguates the credential mechanism
(raw pre-shared secret vs bearer token/jwt) and mirrors the
`ADMIN_AUTH_KEY` env var name.

Migrating: clients and scripts must send `X-Admin-Auth-Key: <ADMIN_AUTH_KEY>`
instead of `X-Admin-Auth`. The env var name is unchanged.

- `server/src/core/middlewares/admin-auth.middleware.ts` — header constant + doc comment
- `docs/quick-start.md`, `docs/setup-guide.md`, `docs/guides/architecture.md`, `docs/examples/api-requests.md` — curl examples & env var table
