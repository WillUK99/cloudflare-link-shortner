import { z } from "zod";

// Base queue message schema
const BaseQueueMessageSchema = z.object({
  type: z.string(),
  data: z.unknown(),
});

// Email queue message schema
export const linkClickMessageSchema = BaseQueueMessageSchema.extend({
  type: z.literal("LINK_CLICK"),
  data: z.object({
    id: z.string(),
    country: z.string().optional(),
    destination: z.string(),
    accountId: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    timestamp: z.string(),
  }),
});

export const queueMessageSchema = z.discriminatedUnion("type", [
  linkClickMessageSchema,
]);

export type LinkClickMessageType = z.infer<typeof linkClickMessageSchema>;
export type QueueMessageType = z.infer<typeof queueMessageSchema>;
