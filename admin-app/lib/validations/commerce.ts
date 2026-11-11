import { z } from 'zod';

const addressField = z.string().trim().max(200).nullable();

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  contactNumber: z.string().trim().regex(/^[+0-9][0-9 ()-]{6,19}$/),
  fulfillment: z.enum(['pickup', 'delivery']),
  branchId: z.string().uuid().nullable(),
  deliveryZoneId: z.string().uuid().nullable(),
  addressLine1: addressField,
  barangay: addressField,
  city: addressField,
  province: addressField,
  postalCode: z.string().trim().max(20).nullable(),
  paymentMethod: z.enum(['cash', 'online', 'home_credit']),
  paymentProvider: z.enum(['gcash', 'bank_transfer', 'card']).nullable(),
  paymentRecipientId: z.string().uuid().nullable(),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(30),
  documents: z.array(z.object({
    kind: z.enum(['payment_proof', 'identity']),
    objectPath: z.string().min(1).max(160),
  })).max(6),
}).superRefine((value, context) => {
  for (const field of ['addressLine1', 'province', 'city', 'barangay'] as const) {
    if (!value[field]?.trim()) {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: 'This address field is required.',
      });
    }
  }
  if (value.documents.some((document) => document.kind === 'payment_proof')) {
    context.addIssue({
      code: 'custom',
      path: ['documents'],
      message: 'Payment proof must be submitted after placing the order.',
    });
  }
  const hasPaymentProvider = Boolean(value.paymentProvider);
  const hasPaymentRecipient = Boolean(value.paymentRecipientId);
  if (
    value.paymentMethod === 'online' ||
    (value.paymentMethod === 'home_credit' && (hasPaymentProvider || hasPaymentRecipient))
  ) {
    if (!value.paymentProvider) {
      context.addIssue({
        code: 'custom',
        path: ['paymentProvider'],
        message: 'Choose an online payment provider.',
      });
    }
    if (!value.paymentRecipientId) {
      context.addIssue({
        code: 'custom',
        path: ['paymentRecipientId'],
        message: 'Choose a payment recipient.',
      });
    }
  } else if (hasPaymentProvider || hasPaymentRecipient) {
    context.addIssue({
      code: 'custom',
      path: ['paymentRecipientId'],
      message: 'A recipient is only valid for online or Home Credit downpayment.',
    });
  }
});

export const paymentProofSubmissionSchema = z.object({
  orderId: z.string().uuid(),
  objectPath: z.string().trim().min(1).max(160),
  paymentReference: z.string().trim().max(120).nullable(),
}).strict();

export const customerOrderPaymentDetailsSchema = z.object({
  order_id: z.string().uuid(),
  order_number: z.string().min(1),
  payment_method: z.enum(['online', 'home_credit']),
  status: z.enum([
    'awaiting_payment',
    'awaiting_confirmation',
    'confirmed',
    'cancelled',
    'expired',
    'completed',
  ]),
  total_minor: z.number().int().nonnegative(),
  payment_due_minor: z.number().int().nonnegative(),
  payment_expires_at: z.string().datetime({ offset: true }).nullable(),
  payment_provider: z.enum(['gcash', 'bank_transfer', 'card']),
  payment_reference: z.string().nullable(),
  recipient_name: z.string().min(1),
  account_details: z.string(),
  payment_qr_path: z.string().min(1),
  has_payment_proof: z.boolean(),
}).strict();

export type CustomerOrderPaymentDetails = z.infer<
  typeof customerOrderPaymentDetailsSchema
>;
