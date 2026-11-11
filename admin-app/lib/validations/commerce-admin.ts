import { z } from 'zod';

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);

export const productAdminSchema = z.object({
  id: z.string().uuid().nullable(),
  slug,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().nullable(),
  imagePath: z.string().regex(/^images\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/).nullable(),
  active: z.boolean(),
});

export const variantAdminSchema = z.object({
  id: z.string().uuid().nullable(),
  productId: z.string().uuid(),
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  specifications: z.record(
    z.string().trim().min(1).max(80),
    z.string().trim().min(1).max(500)
  ).nullable().superRefine((specifications, context) => {
    if (!specifications) return;
    const keys = Object.keys(specifications);
    if (keys.length > 30) {
      context.addIssue({ code: 'custom', message: 'Add no more than 30 specifications.' });
    }
    if (keys.some((key) => ['__proto__', 'prototype', 'constructor'].includes(key.toLowerCase()))) {
      context.addIssue({ code: 'custom', message: 'Use a different specification name.' });
    }
  }),
  priceMinor: z.number().int().min(0).max(2147483647),
  reservationMinor: z.number().int().min(0).max(2147483647),
  homeCreditDownpaymentMinor: z.number().int().min(0).max(2147483647),
  imagePath: z.string().regex(/^images\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/).nullable(),
  active: z.boolean(),
}).superRefine(({ priceMinor, reservationMinor, homeCreditDownpaymentMinor }, context) => {
  if (reservationMinor > priceMinor) {
    context.addIssue({
      code: 'custom',
      path: ['reservationMinor'],
      message: 'Reservation cannot exceed the variant price.',
    });
  }
  if (homeCreditDownpaymentMinor > priceMinor) {
    context.addIssue({
      code: 'custom',
      path: ['homeCreditDownpaymentMinor'],
      message: 'Home Credit downpayment cannot exceed the variant price.',
    });
  }
});

export const inventoryAdminSchema = z.object({
  branchId: z.string().uuid(),
  variantId: z.string().uuid(),
  stock: z.number().int().min(0).max(1000000),
});

const serialNumber = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._/-]+$/);

export const ebikeInventoryAdminSchema = z.object({
  branchId: z.string().uuid(),
  variantId: z.string().uuid(),
  units: z.array(z.object({
    unitId: z.string().uuid().nullable(),
    serialNumber,
    motorNumber: serialNumber,
  })).min(1).max(50),
});

export const subcategoryAdminSchema = z.object({
  id: z.string().uuid().nullable(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  slug,
  active: z.boolean(),
});

export const productCategoryAdminSchema = z.object({
  id: z.string().uuid().nullable(),
  tracksSerialInventory: z.boolean(),
  name: z.string().trim().min(2).max(80),
  slug,
});

export const branchTransferAdminSchema = z.object({
  sourceBranchId: z.string().uuid(),
  destinationBranchId: z.string().uuid(),
  note: z.string().trim().max(500).nullable(),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(1000),
    unitIds: z.array(z.string().uuid()).max(1000),
  })).min(1).max(30).superRefine((items, context) => {
    if (new Set(items.map((item) => item.variantId)).size !== items.length) {
      context.addIssue({ code: 'custom', message: 'A variant can appear only once.', path: [] });
    }
    const unitIds = items.flatMap((item) => item.unitIds);
    if (new Set(unitIds).size !== unitIds.length) {
      context.addIssue({ code: 'custom', message: 'An e-bike unit can appear only once.', path: [] });
    }
  }),
});

export const branchAdminSchema = z.object({
  id: z.string().uuid().nullable(),
  slug,
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(500),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
  active: z.boolean(),
}).superRefine(({ latitude, longitude }, context) => {
  if ((latitude === null) !== (longitude === null)) {
    context.addIssue({
      code: 'custom',
      message: 'Select a complete location on the map.',
      path: ['latitude'],
    });
  }
});

export const deliveryZoneAdminSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(2).max(120),
  feeMinor: z.number().int().min(0).max(2147483647),
  active: z.boolean(),
});
