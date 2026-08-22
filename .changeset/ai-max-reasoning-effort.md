---
"@groot/ai": minor
---

feat(ai): add maxReasoningEffort() — resolve a model's highest supported reasoning effort

New export in `capabilities.ts` alongside `getModelCapabilities`. Maps a
gateway model id to the highest `reasoning_effort` value it accepts (or
`undefined` when the model has no effort control), sourced from ClinePass's
model catalog (the `reasoningOptions` effort values embedded in the cline CLI):

- kimi-k3 → `"max"` (catalog: low/high/max — most callers hardcode "high"
  and leave the top level unused)
- glm-5.2 / deepseek-v4 / qwen3.8-max → `"xhigh"`
- kimi-k2.6/k2.7-code, qwen3.7*, mimo*, minimax-m3 → `undefined` (param must
  be omitted — these models accept no effort control)
- unknown models → `"high"` (safe default every OpenAI-compatible reasoning
  API accepts)

Also exports the `ReasoningEffort` union (pi-ai's ThinkingLevel + `"max"`)
for typing the parameter at call sites.
