import { z } from 'zod';
import { normalizePhilippineMobileNumber } from '@/lib/phone-number';

const phoneNumber = z.string().trim().min(1).max(24).refine(
  (value) => normalizePhilippineMobileNumber(value) !== null,
  'Enter a valid Philippine mobile number.'
);

export const requestPhoneVerificationSchema = z.object({
  phoneNumber,
}).strict();

export const verifyPhoneVerificationSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^[0-9]{6}$/),
}).strict();

export type RequestPhoneVerificationInput = z.infer<
  typeof requestPhoneVerificationSchema
>;
