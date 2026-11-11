import { z } from 'zod';

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

export const certificateTemplatePathSchema = z.string().regex(
  new RegExp(`^templates/${uuid}\\.pdf$`)
);

export const settingsAssetPathSchema = z.string().regex(
  new RegExp(
    `^(templates/${uuid}\\.pdf|logos/${uuid}\\.(jpg|png|webp)|recipients/(gcash|bank_transfer|card)/qr/${uuid}\\.(jpg|png|webp))$`
  )
);

export const businessSettingsSchema = z.object({
  businessName: z.string().trim().min(1).max(120).refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value)
  ),
  phone: z.string().trim().max(40).refine(
    (value) => value === '' || /^\+?[0-9][0-9() .-]{2,38}$/.test(value)
  ),
  email: z.string().trim().max(254).email().or(z.literal('')),
  address: z.string().trim().max(300).refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value)
  ),
  businessHours: z.string().trim().max(200).refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value)
  ),
  logoPath: z.string().regex(new RegExp(`^logos/${uuid}\\.(jpg|png|webp)$`)).nullable(),
}).strict();

export const paymentRecipientSettingsSchema = z.object({
  id: z.string().uuid().nullable(),
  provider: z.enum(['gcash', 'bank_transfer', 'card']),
  recipientName: z.string().trim().min(1).max(120).refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value)
  ),
  accountDetails: z.string().trim().min(1).max(500).refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value)
  ),
  paymentQrPath: z.string(),
  active: z.boolean(),
}).strict().superRefine((value, context) => {
  if (!new RegExp(`^recipients/${value.provider}/qr/${uuid}\\.(jpg|png|webp)$`).test(value.paymentQrPath)) {
    context.addIssue({
      code: 'custom',
      path: ['paymentQrPath'],
      message: 'Upload a valid payment QR image.',
    });
  }
});
