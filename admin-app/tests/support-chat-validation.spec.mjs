import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldShowTimeDivider } from '../lib/support-chat/message-time.ts';
import {
  guestEmailAccessVerifySchema,
  pendingGuestChatRecoverySchema,
  startGuestEmailChatSchema,
  startGuestPhoneChatSchema,
  supportChatMessageSchema,
  supportChatReadSchema,
} from '../lib/validations/support-chat.ts';

test('message time dividers show at conversation start and after 10 minutes', () => {
  const start = '2026-11-15T10:00:00.000Z';
  assert.equal(shouldShowTimeDivider(start, null, true), true);
  assert.equal(
    shouldShowTimeDivider('2026-11-15T10:09:59.999Z', start, false),
    false,
  );
  assert.equal(
    shouldShowTimeDivider('2026-11-15T10:10:00.000Z', start, false),
    true,
  );
});

test('pending guest recovery state validates its cookie payload', () => {
  assert.deepEqual(
    pendingGuestChatRecoverySchema.safeParse({
      name: 'Sam',
      email: 'sam@example.com',
      requestedAt: 1,
    }).data,
    { name: 'Sam', email: 'sam@example.com', requestedAt: 1 },
  );
  assert.equal(
    pendingGuestChatRecoverySchema.safeParse({
      name: 'Sam',
      email: 'invalid',
      requestedAt: 1,
    }).success,
    false,
  );
});

test('email guest starts require a name and a valid email', () => {
  assert.equal(
    startGuestEmailChatSchema.safeParse({
      name: '  Sam  ',
      email: 'sam@example.com',
    }).success,
    true,
  );
  assert.equal(
    startGuestEmailChatSchema.safeParse({
      name: 'Sam',
      email: 'not-an-email',
    }).success,
    false,
  );
});

test('phone guest starts reject invalid numbers', () => {
  assert.equal(
    startGuestPhoneChatSchema.safeParse({
      name: 'Sam',
      phone: '09123456789',
    }).success,
    true,
  );
  assert.equal(
    startGuestPhoneChatSchema.safeParse({
      name: 'Sam',
      phone: '+63 912 345 6789',
    }).success,
    false,
  );
});

test('email verification accepts only six-digit codes', () => {
  assert.equal(
    guestEmailAccessVerifySchema.safeParse({
      email: 'sam@example.com',
      code: '012345',
    }).success,
    true,
  );
  assert.equal(
    guestEmailAccessVerifySchema.safeParse({
      email: 'sam@example.com',
      code: '12345',
    }).success,
    false,
  );
});

test('chat messages are trimmed and capped at 4000 characters', () => {
  assert.equal(
    supportChatMessageSchema.safeParse({
      threadId: '2ae8af24-c85a-44c3-9411-429fb0eb57d9',
      body: ` ${'a'.repeat(4000)} `,
    }).success,
    true,
  );
  assert.equal(
    supportChatMessageSchema.safeParse({
      threadId: '2ae8af24-c85a-44c3-9411-429fb0eb57d9',
      body: 'a'.repeat(4001),
    }).success,
    false,
  );
});

test('staff read requests require valid thread and message ids', () => {
  assert.equal(
    supportChatReadSchema.safeParse({
      threadId: '2ae8af24-c85a-44c3-9411-429fb0eb57d9',
      messageId: '2ae8af24-c85a-44c3-9411-429fb0eb57da',
    }).success,
    true,
  );
  assert.equal(
    supportChatReadSchema.safeParse({ threadId: 'invalid' }).success,
    false,
  );
});
