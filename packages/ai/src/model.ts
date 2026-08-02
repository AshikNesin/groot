import { getModel } from "@earendil-works/pi-ai/compat";
import type { AIConfig, AnyModel } from "./types";

/**
 * Resolve the pi-ai model for a config.
 *
 * - With `baseUrl`: builds an OpenAI-compatible model pointed at the custom
 *   endpoint (e.g. Cloudflare AI Gateway), bypassing the built-in catalog.
 * - Without: looks the model up in pi-ai's generated catalog. pi-ai returns
 *   `undefined` for unknown ids, so we throw a helpful error instead of
 *   failing obscurely at request time.
 *
 * Pass `modelId` to reuse the same provider/endpoint with a different model.
 */
export function resolveModel(config: AIConfig, modelId: string = config.model): AnyModel {
  if (config.baseUrl) {
    return {
      id: modelId,
      name: modelId,
      api: "openai-completions",
      provider: config.provider,
      baseUrl: config.baseUrl,
      reasoning: config.reasoning ?? false,
      input: config.input ?? ["text", "image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,
      maxTokens: 16_384,
      ...(config.headers ? { headers: config.headers } : {}),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = getModel(config.provider as any, modelId) as AnyModel | undefined;
  if (!model) {
    throw new Error(
      `Unknown model "${config.provider}/${modelId}". Check the id against the pi-ai catalog, ` +
        `or set baseUrl in AIConfig to use a custom OpenAI-compatible endpoint.`,
    );
  }
  return model;
}
