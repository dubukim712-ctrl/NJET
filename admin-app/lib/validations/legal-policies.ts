import { z } from 'zod';

const policyText = (max: number) => z.string()
  .trim()
  .min(1)
  .max(max)
  .refine(
    (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value),
    'Remove unsupported control characters.'
  );

export const legalPolicySectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: policyText(120),
  summary: policyText(300),
  paragraphs: z.array(policyText(5000)).min(1).max(10),
  bullets: z.array(policyText(1000)).max(20).optional(),
}).strict();

export const legalPolicySaveSchema = z.object({
  slug: z.enum(['terms', 'return-policy', 'privacy']),
  baseVersion: z.string().min(1).max(100),
  intro: policyText(3000),
  sections: z.array(legalPolicySectionSchema).min(1).max(30),
}).strict().superRefine(({ intro, sections }, context) => {
  const ids = sections.map((section) => section.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: 'custom',
      path: ['sections'],
      message: 'Each section must have a unique anchor.',
    });
  }
  if (new TextEncoder().encode(JSON.stringify({ intro, sections })).length > 200_000) {
    context.addIssue({
      code: 'custom',
      path: ['sections'],
      message: 'Keep the complete policy below 200 KB.',
    });
  }
});
