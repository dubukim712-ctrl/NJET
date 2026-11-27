import { z } from 'zod';
import { philippineMobileSchema } from './philippine-mobile.ts';

export const requestPhoneVerificationSchema = z.object({
  phoneNumber: philippineMobileSchema,
}).strict();

export const verifyPhoneVerificationSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^[0-9]{6}$/),
}).strict();

export type RequestPhoneVerificationInput = z.infer<
  typeof requestPhoneVerificationSchema
>;
