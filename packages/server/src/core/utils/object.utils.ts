/**
 * Deep freeze for runtime immutability.
 * Recursively freezes all nested objects and arrays.
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const val of Object.values(obj as Record<string, unknown>)) deepFreeze(val);
  return obj;
}

/**
 * lodash.mergewith customizer: arrays replace (not concatenate),
 * objects merge recursively.
 */
export const replaceArrays = (_targetVal: unknown, sourceVal: unknown) => {
  if (Array.isArray(sourceVal)) return sourceVal;
  return undefined;
};
