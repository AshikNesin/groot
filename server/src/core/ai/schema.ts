import { Type, type TSchema } from "@mariozechner/pi-ai";
import type { z } from "zod";

/**
 * Convert a Zod schema to a TypeBox schema for pi-ai tool definitions.
 * Supports common types: string, number, boolean, object, array, optional, enum, nullable.
 */
export function zodToTypeBox(schema: z.ZodTypeAny): TSchema {
  // Access internal Zod definition - ZodTypeAny doesn't expose _def in types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def;
  if (!def) {
    return Type.Any();
  }

  const typeName = def.typeName;

  switch (typeName) {
    case "ZodString":
      return Type.String(def.description ? { description: def.description } : undefined);

    case "ZodNumber":
      return Type.Number(def.description ? { description: def.description } : undefined);

    case "ZodBoolean":
      return Type.Boolean(def.description ? { description: def.description } : undefined);

    case "ZodObject": {
      const shape = def.shape?.();
      if (!shape) return Type.Object({});
      const properties: Record<string, TSchema> = {};
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToTypeBox(value as z.ZodTypeAny);
      }
      return Type.Object(properties);
    }

    case "ZodArray":
      return Type.Array(zodToTypeBox(def.type));

    case "ZodOptional":
      return Type.Optional(zodToTypeBox(def.innerType));

    case "ZodNullable":
      return Type.Union([zodToTypeBox(def.innerType), Type.Null()]);

    case "ZodEnum":
      return Type.Union((def.values as string[]).map((v: string) => Type.Literal(v)));

    case "ZodLiteral":
      return Type.Literal(def.value);

    case "ZodDefault":
      return zodToTypeBox(def.innerType);

    case "ZodEffects":
      return zodToTypeBox(def.schema);

    default:
      return Type.Any();
  }
}
