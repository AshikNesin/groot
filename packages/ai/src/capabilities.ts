/**
 * Model capability detection for gateway-hosted models.
 *
 * Different providers behind a gateway accept different attachment types.
 * Gemini/Claude/GPT accept native document (PDF) parts; others (e.g. Kimi
 * behind ClinePass) accept images only, so PDFs must be rasterized first.
 *
 * Pure and dependency-free so it can be unit-tested without network calls.
 */

export interface ModelCapabilities {
  /** Accepts native document (PDF) attachments. */
  nativeDocuments: boolean;
  /** Accepts image attachments. */
  nativeImages: boolean;
}

export interface CapabilityRule {
  test: RegExp;
  capabilities: ModelCapabilities;
}

const ALL_TRUE: ModelCapabilities = { nativeDocuments: true, nativeImages: true };
const IMAGES_ONLY: ModelCapabilities = { nativeDocuments: false, nativeImages: true };
const NONE: ModelCapabilities = { nativeDocuments: false, nativeImages: false };

/** First match wins; rules are tested case-insensitively against the model id. */
const DEFAULT_RULES: CapabilityRule[] = [
  // Document + image capable providers
  { test: /gemini|vertex/i, capabilities: ALL_TRUE },
  { test: /claude|anthropic/i, capabilities: ALL_TRUE },
  { test: /gpt-4o|gpt-4\.1|gpt-5|openai\//i, capabilities: ALL_TRUE },
  // Text-only open models (must precede the cline-pass catch-all below,
  // since cline-pass also serves these: cline-pass/deepseek-v4-pro, etc.)
  { test: /glm|deepseek|qwen|minimax|mimo/i, capabilities: NONE },
  // ClinePass-curated models that remain (e.g. kimi): image-capable, no documents
  { test: /cline-pass|clinepass|kimi/i, capabilities: IMAGES_ONLY },
];

/**
 * Look up what attachment types a model accepts, based on its model id.
 *
 * Unknown models default to image-only — the shape every OpenAI-compatible
 * endpoint accepts. `extraRules` are checked before the defaults.
 */
export function getModelCapabilities(
  modelId: string,
  extraRules: CapabilityRule[] = [],
): ModelCapabilities {
  for (const rule of [...extraRules, ...DEFAULT_RULES]) {
    if (rule.test.test(modelId)) {
      return rule.capabilities;
    }
  }
  return IMAGES_ONLY;
}
