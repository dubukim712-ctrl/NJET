import { z } from 'zod';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const branchServiceHoursSchema = z.object({
  branchId: z.string().uuid(),
  hours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    opensAt: z.string().regex(timePattern),
    closesAt: z.string().regex(timePattern),
  }).strict()).length(7),
}).strict().superRefine(({ hours }, context) => {
  if (new Set(hours.map(({ dayOfWeek }) => dayOfWeek)).size !== 7) {
    context.addIssue({
      code: 'custom',
      path: ['hours'],
      message: 'Include each day of the week exactly once.',
    });
  }
  hours.forEach(({ isOpen, opensAt, closesAt }, index) => {
    if (isOpen && opensAt >= closesAt) {
      context.addIssue({
        code: 'custom',
        path: ['hours', index, 'closesAt'],
        message: 'Closing time must be after opening time.',
      });
    }
  });
});

export const customerServiceAvailabilitySchema = z.object({
  branchId: z.string().uuid(),
  slotStart: z.string().datetime({ offset: true }).refine((value) => {
    const time = new Date(value);
    return [0, 30].includes(time.getUTCMinutes()) && time.getUTCSeconds() === 0;
  }, 'Choose a time at the start of a 30-minute slot.'),
}).strict();

export const customerServiceAppointmentSlotsSchema = z.object({
  branchId: z.string().uuid(),
  date: z.iso.date(),
}).strict();

export const serviceAppointmentClosureCreateSchema = z.object({
  branchId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }).refine((value) => {
    const time = new Date(value);
    return [0, 30].includes(time.getUTCMinutes()) && time.getUTCSeconds() === 0;
  }, 'Choose a start on a 30-minute boundary.'),
  endsAt: z.string().datetime({ offset: true }).refine((value) => {
    const time = new Date(value);
    return [0, 30].includes(time.getUTCMinutes()) && time.getUTCSeconds() === 0;
  }, 'Choose an end on a 30-minute boundary.'),
  reason: z.string().trim().max(300),
}).strict().superRefine(({ startsAt, endsAt }, context) => {
  if (Date.parse(startsAt) <= Date.now()) {
    context.addIssue({
      code: 'custom',
      path: ['startsAt'],
      message: 'Choose a future closure start time.',
    });
  }
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    context.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'Closure end must be after its start.',
    });
  }
});

export const serviceAppointmentClosureIdSchema = z.string().uuid();
export const serviceAppointmentClosuresFilterSchema = z.object({
  branchId: z.union([z.string().uuid(), z.literal('')]).catch(''),
}).strict();
