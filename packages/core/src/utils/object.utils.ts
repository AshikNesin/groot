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

type Customizer = (targetVal: unknown, sourceVal: unknown, key: string) => unknown;

/**
 * Minimal deep-merge with customizer, replacing the lodash.mergewith dependency.
 * Merges `source` into a shallow copy of `target`, recursing into plain objects.
 * Arrays and primitives are handled by the customizer first; if it returns
 * `undefined` the default behaviour applies (overwrite with source value).
 */
export function mergeWith(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  customizer: Customizer,
): Record<string, unknown> {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = output[key];
    const custom = customizer(tgtVal, srcVal, key);
    if (custom !== undefined) {
      output[key] = custom;
    } else if (
      srcVal !== null &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      output[key] = mergeWith(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
        customizer,
      );
    } else {
      output[key] = srcVal;
    }
  }
  return output;
}
