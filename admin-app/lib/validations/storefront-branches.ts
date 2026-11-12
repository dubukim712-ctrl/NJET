import { z } from 'zod';

export const StorefrontBranchLocationsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(5).max(500),
    latitude: z.number().finite().min(-90).max(90).nullable(),
    longitude: z.number().finite().min(-180).max(180).nullable(),
  }).strict().superRefine(({ latitude, longitude }, context) => {
    if ((latitude === null) !== (longitude === null)) {
      context.addIssue({
        code: 'custom',
        message: 'A branch location must include both coordinates.',
        path: ['latitude'],
      });
    }
  })
).max(100);

export type StorefrontBranchLocation = z.infer<
  typeof StorefrontBranchLocationsSchema
>[number];
