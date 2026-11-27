import { z } from 'zod';
import { PHILIPPINE_MOBILE_ERROR, philippineMobileSchema } from './philippine-mobile.ts';

const locationCode = z.string().trim().regex(/^([0-9]{1,20})?$/, 'Select a valid location.');
const addressText = z.string().trim().max(200, 'Use no more than 200 characters.');

export const profileContactSchema = z.object({
  phoneNumber: z.union([philippineMobileSchema, z.literal('')], { error: PHILIPPINE_MOBILE_ERROR })
    .transform((value) => value || null),
  addressLine1: addressText,
  provinceCode: locationCode,
  province: addressText,
  cityCode: locationCode,
  city: addressText,
  barangayCode: locationCode,
  barangay: addressText,
  postalCode: z.string().trim().max(20, 'Use no more than 20 characters.'),
}).superRefine((value, context) => {
  const required = [
    ['addressLine1', value.addressLine1],
    ['province', value.province && value.provinceCode],
    ['city', value.city && value.cityCode],
    ['barangay', value.barangay && value.barangayCode],
  ] as const;

  if (Object.entries(value).some(([key, field]) => key !== 'phoneNumber' && field)) {
    for (const [field, present] of required) {
      if (!present) context.addIssue({
        code: 'custom',
        path: [field],
        message: field === 'addressLine1' ? 'Enter your street address.' : 'Select a location.',
      });
    }
  }
});
