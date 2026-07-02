import { Type, type TSchema } from "@mariozechner/pi-ai";
import type { z } from "zod";

/**
 * Convert a Zod schema to a TypeBox schema for pi-ai tool definitions.
 * Supports common types: string, number, boolean, object, array, optional, enum, nullable.
 *
 * Reads Zod's internal `_def`. Zod 4 renamed the discriminator from
 * `_def.typeName` (PascalCase, e.g. "ZodString") to `_def.type` (lowercase,
 * e.g. "string"), and changed enum (`values`→`entries`) and literal storage.
 * Both shapes are handled so this works under zod 3 and zod 4.
 */
export function zodToTypeBox(schema: z.ZodTypeAny): TSchema {
  // Access internal Zod definition - ZodTypeAny doesn't expose _def in types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def;
  if (!def) {
    return Type.Any();
  }

  const typeName: string = def.type ?? def.typeName; // v4: type, v3: typeName

  switch (typeName) {
    case "ZodString":
    case "string":
      return Type.String(def.description ? { description: def.description } : undefined);

    case "ZodNumber":
    case "number":
      return Type.Number(def.description ? { description: def.description } : undefined);

    case "ZodBoolean":
    case "boolean":
      return Type.Boolean(def.description ? { description: def.description } : undefined);

    case "ZodObject":
    case "object": {
      const shape = typeof def.shape === "function" ? def.shape() : def.shape;
      if (!shape) return Type.Object({});
      const properties: Record<string, TSchema> = {};
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToTypeBox(value as z.ZodTypeAny);
      }
      return Type.Object(properties);
    }

    case "ZodArray":
    case "array":
      return Type.Array(zodToTypeBox(def.element ?? def.type));

    case "ZodOptional":
    case "optional":
      return Type.Optional(zodToTypeBox(def.innerType));

    case "ZodNullable":
    case "nullable":
      return Type.Union([zodToTypeBox(def.innerType), Type.Null()]);

    case "ZodEnum":
    case "enum": {
      // v4: entries (object); v3: values (array)
      const values: string[] = def.entries ? Object.keys(def.entries) : (def.values as string[]);
      return Type.Union(values.map((v: string) => Type.Literal(v)));
    }

    case "ZodLiteral":
    case "literal": {
      // v3: value; v4: values (array or object)
      const v =
        def.value ?? (Array.isArray(def.values) ? def.values[0] : Object.keys(def.values)[0]);
      return Type.Literal(v);
    }

    case "ZodDefault":
    case "default":
      return zodToTypeBox(def.innerType);

    case "ZodEffects":
    case "pipe": // v4 models transforms as a "pipe" with .in/.out
      return zodToTypeBox(def.schema ?? def.in);

    default:
      return Type.Any();
  }
}
