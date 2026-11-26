import { z } from 'zod';

const guestPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9() .-]{5,23}$/)
  .refine((value) => value.replace(/[^0-9]/g, '').length >= 7);

export const startGuestEmailChatSchema = z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
  });

export const pendingGuestChatRecoverySchema = startGuestEmailChatSchema.extend({
  requestedAt: z.number().int().positive(),
});

export const startGuestPhoneChatSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: guestPhoneSchema,
});

export const guestEmailAccessVerifySchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

export const supportChatMessageSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const supportChatMessagesSchema = z.object({
  threadId: z.string().uuid(),
  beforeCreatedAt: z.string().datetime().optional(),
  beforeId: z.string().uuid().optional(),
}).refine(
  (value) => Boolean(value.beforeCreatedAt) === Boolean(value.beforeId),
  { message: 'Invalid message history cursor.' },
);

export const supportChatDeleteSchema = z.object({
  messageId: z.string().uuid(),
  scope: z.enum(['for_you', 'for_everyone']),
});

export const supportChatInboxSchema = z.object({
  status: z.enum(['open', 'resolved', 'all']),
  search: z.string().trim().max(100),
  beforeLastMessageAt: z.string().datetime({ offset: true }).optional(),
  beforeThreadId: z.string().uuid().optional(),
}).refine(
  (value) => Boolean(value.beforeLastMessageAt) === Boolean(value.beforeThreadId),
  { message: 'Invalid chat inbox cursor.' },
);

export const supportChatStatusSchema = z.object({
  threadId: z.string().uuid(),
  status: z.enum(['open', 'resolved']),
});

export const supportChatReadSchema = z.object({
  threadId: z.string().uuid(),
  messageId: z.string().uuid(),
});
