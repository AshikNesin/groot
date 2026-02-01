import { z } from "zod";

export const upsertAppSettingSchema = z.object({
  value: z.unknown(),
  metadata: z
    .object({
      description: z.string().optional(),
    })
    .optional(),
});

export type UpsertAppSettingDTO = z.infer<typeof upsertAppSettingSchema>;
