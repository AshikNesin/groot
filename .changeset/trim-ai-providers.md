---
"groot": patch
---

refactor(ai): trim built-in AI providers to OpenAI and Google (Gemini)

Remove the `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`,
`XAI_API_KEY`, and `OPENROUTER_API_KEY` keys from `.env.schema` and drop the
corresponding provider detection and model lists. The default AI provider/model
is now `openai` / `gpt-4o-mini` (previously `anthropic` / `claude-sonnet-4-6`),
updated in `config.schema.ts`, the client AI store, and the config test. Docs
and the boilerplate env example are updated to match.

Additional providers remain trivially re-addable by adding a key to `.env.schema`
and a provider entry to `getAvailableProviders()` / `PROVIDER_DEFAULTS()`.
