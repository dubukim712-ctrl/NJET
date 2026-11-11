import { z } from 'zod';

const MAX_MINOR_UNITS = 2147483647;

const phpAmount = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, 'Enter a valid PHP amount.')
  .transform((value) => {
    const [whole, fraction = ''] = value.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  })
  .refine(
    (amount) => Number.isSafeInteger(amount) && amount <= MAX_MINOR_UNITS,
    'The amount is too large.'
  );

export const homeCreditProcessingSchema = z.object({
  accountNo: z
    .string()
    .trim()
    .min(1, 'Enter the Home Credit account number.')
    .max(80)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Enter a valid account number.'),
  downpayment: phpAmount,
  termsMonths: z
    .string()
    .regex(/^\d+$/, 'Enter the term in whole months.')
    .transform(Number)
    .pipe(z.number().int().min(1).max(120)),
  monthlyPayment: phpAmount,
});

export const completeHomeCreditOrderSchema =
  homeCreditProcessingSchema.extend({
    orderId: z.string().uuid(),
  });
