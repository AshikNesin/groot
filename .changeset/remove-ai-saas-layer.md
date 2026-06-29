---
"groot": minor
---

refactor(ai): drop the built-in AI chat/usage/conversation feature — keep only the core adapter

The boilerplate shipped a full AI SaaS layer (chat endpoints, token-usage
tracking, conversation persistence, a Dashboard UI) on top of the core
`AIClient` adapter. That was over-scoped: opinionated feature code that every
consumer inherited whether they wanted an AI chat app or not. The core adapter
is the part that earns its place in the boilerplate — it's DB-free, route-free,
opinion-free infrastructure, same tier as `logger`/`kv`/`storage`.

This change removes the feature and leaves the adapter. Consumers who actually
need chat/usage/conversations should build them in `server/src/app/<feature>/`
using the adapter, exactly like any other feature.

Removed (was forcing AI into the boilerplate):

- `server/src/shared/ai/**` — chat routes, usage + conversation
  models/services/controllers, validation.
- `client/src/core/{lib/ai-client,store/ai,types/ai}.ts` — synced "core" files
  that existed only to feed the AI UI.
- `client/src/app/ai/**` — the Dashboard + hooks; `App.tsx` index route now
  redirects to `/todos`.
- **DB**: `AIUsage` + `AIConversation` models and their `User` relations, with
  a generated `drop_ai_tables` migration (diffed via `prisma migrate diff`,
  not hand-written; the baseline migration is untouched).
- **Config**: `config.ai.*` and `config.rateLimits.{ai,aiStream}` (schema,
  `config.yml`, `config.example.yml`).
- `aiRateLimiter` / `aiStreamRateLimiter` and their error codes
  (`AI_RATE_LIMIT_EXCEEDED`, `AI_STREAM_RATE_LIMIT_EXCEEDED`).
- Stale `/api/v1/ai` references across `docs/`, and the `shared/` directory
  comment in `AGENTS.md` (no longer lists `ai` — it lives only in `core/`).

Kept:

- `server/src/core/ai/**` — the `AIClient` adapter over `@mariozechner/pi-ai`
  (complete / stream / generateObject / embed).
- `OPENAI_API_KEY` in `.env.schema`.

> Note for consumers syncing from groot: if you built on the removed chat
> feature, your imports (`@/shared/ai`, `@/core/lib/ai-client`,
> `@/core/types/ai`, `@/core/store/ai`) and `/api/v1/ai` routes will go away on
> the next `groot:sync`. Move that code into your own `app/` layer before
> syncing. The schema/migrations are never synced, so your `ai_usage` /
> `ai_conversations` tables are untouched.

Verified: `prisma validate` + `prisma generate` clean, `vp check` 0 errors,
`pnpm test` 83 passing.
