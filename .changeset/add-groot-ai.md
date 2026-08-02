---
"groot": minor
---

feat(ai): introduce the `@groot/ai` package

- The AI adapter moves from `@groot/core/ai` to a dedicated `packages/ai` (`@groot/ai`). **Breaking:** update imports from `@groot/core/ai` to `@groot/ai`.
- Adds custom OpenAI-compatible endpoint support (`baseUrl` + `headers`), so gateways like Cloudflare AI Gateway work through pi-ai instead of a hand-rolled client.
- Adds `definePrompt()` + `ai.execute()` for typed prompt tasks with Zod-validated input and output, and per-call model overrides via `ai.withModel()`.
- Adds `getModelCapabilities()` for native image/document support detection.
- Fixes `generateObject()`'s object check under Zod 4, surfaces provider errors via `stopReason`, and adds an `embeddingModel` config (embeddings no longer reuse the chat model id).
