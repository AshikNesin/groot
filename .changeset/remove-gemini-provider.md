---
"groot": patch
---

refactor(ai): remove Gemini provider, leaving OpenAI as the sole built-in AI provider

Drop `GEMINI_API_KEY` from `.env.schema`, the client provider defaults, the
config docs/examples, and `ai.service.ts` (provider detection, model list, and
cost/display maps). Also clean up stale `claude-*` entries left in the model
display-name and cost maps from the earlier provider trim.

OpenAI remains the only built-in provider. Additional providers remain trivially
re-addable by adding a key to `.env.schema` and entries to `getAvailableProviders()`
and `PROVIDER_DEFAULTS`.
