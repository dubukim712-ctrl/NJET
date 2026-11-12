import { z } from 'zod';
import type {
  ServiceAppointmentMode,
  ServiceAppointmentStatus,
  ServiceAppointmentType,
} from '@/types/commerce-tables';

export const SERVICE_APPOINTMENT_MODES = [
  'branch_visit',
  'home_service',
] as const satisfies readonly ServiceAppointmentMode[];

export const SERVICE_APPOINTMENT_TYPES = [
  'maintenance',
  'repair',
  'inspection',
  'other',
] as const satisfies readonly ServiceAppointmentType[];

export const SERVICE_APPOINTMENT_STATUSES = [
  'requested',
  'confirmed',
  'in_service',
  'ready_for_pickup',
  'completed',
  'cancelled',
  'no_show',
] as const satisfies readonly ServiceAppointmentStatus[];

const appointmentDetailsSchema = z.object({
  branchId: z.string().uuid(),
  serviceMode: z.enum(SERVICE_APPOINTMENT_MODES),
  serviceType: z.enum(SERVICE_APPOINTMENT_TYPES),
  bikeMake: z.string().trim().min(1).max(80),
  bikeModel: z.string().trim().min(1).max(100),
  bikeSerialNumber: z.string().trim().max(100).optional(),
  issueDescription: z.string().trim().min(5).max(2000),
  addressLine1: z.string().trim().max(200).optional(),
  barangay: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
});

function validateServiceAddress(
  value: z.infer<typeof appointmentDetailsSchema>,
  context: z.RefinementCtx
) {
  const addressFields = [
    ['addressLine1', value.addressLine1],
    ['barangay', value.barangay],
    ['city', value.city],
    ['province', value.province],
  ] as const;

  if (value.serviceMode === 'home_service') {
    for (const [field, address] of addressFields) {
      if (!address) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: 'This field is required for a home service.',
        });
      }
    }
  } else if (addressFields.some(([, address]) => address) || value.postalCode) {
    context.addIssue({
      code: 'custom',
      path: ['addressLine1'],
      message: 'Address details are only used for home service.',
    });
  }
}

function validateThirtyMinuteSlot(
  value: string,
  context: z.RefinementCtx,
  field: string
) {
  const date = new Date(value);
  if ([0, 30].includes(date.getUTCMinutes()) && date.getUTCSeconds() === 0) return;
  context.addIssue({
    code: 'custom',
    path: [field],
    message: 'Choose a time at the start of a 30-minute slot.',
  });
}

const contactNumberSchema = z.string().regex(
  /^[0-9]{7,11}$/,
  'Enter a contact number with 7 to 11 digits.'
);

export const customerServiceAppointmentRequestSchema =
  appointmentDetailsSchema.extend({
    contactNumber: contactNumberSchema,
    preferredStartAt: z.string().datetime({ offset: true }),
  }).strict().superRefine((value, context) => {
    validateServiceAddress(value, context);
    validateThirtyMinuteSlot(value.preferredStartAt, context, 'preferredStartAt');
    if (Date.parse(value.preferredStartAt) <= Date.now()) {
      context.addIssue({
        code: 'custom',
        path: ['preferredStartAt'],
        message: 'Choose a future preferred appointment time.',
      });
    }
  });

export const staffServiceAppointmentCreateSchema =
  appointmentDetailsSchema.extend({
    customerName: z.string().trim().min(2).max(100),
    contactNumber: contactNumberSchema,
    scheduledAt: z.string().datetime({ offset: true }),
    assignedTechnicianId: z.string().uuid(),
    estimateMinor: z.number().int().min(0).nullable(),
  }).strict().superRefine((value, context) => {
    validateServiceAddress(value, context);
    validateThirtyMinuteSlot(value.scheduledAt, context, 'scheduledAt');
    if (Date.parse(value.scheduledAt) <= Date.now()) {
      context.addIssue({
        code: 'custom',
        path: ['scheduledAt'],
        message: 'Choose a future appointment time.',
      });
    }
  });

export const staffServiceAppointmentUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(SERVICE_APPOINTMENT_STATUSES),
  scheduledAt: z.string().datetime({ offset: true }).nullable(),
  assignedTechnicianId: z.string().uuid().nullable(),
  estimateMinor: z.number().int().min(0).nullable(),
  finalTotalMinor: z.number().int().min(0).nullable(),
}).strict().superRefine((value, context) => {
  if (
    value.status === 'requested' &&
    (value.scheduledAt !== null || value.assignedTechnicianId !== null)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['status'],
      message: 'A requested appointment cannot have a scheduled time or assigned technician.',
    });
  } else if (
    value.status !== 'requested' &&
    value.status !== 'cancelled' &&
    (!value.scheduledAt || !value.assignedTechnicianId)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['assignedTechnicianId'],
      message: 'Choose a scheduled time and technician before confirming this appointment.',
    });
  }
});

export const serviceAppointmentFiltersSchema = z.object({
  status: z.union([z.enum(SERVICE_APPOINTMENT_STATUSES), z.literal('')]).catch(''),
  branchId: z.union([z.string().uuid(), z.literal('')]).catch(''),
  date: z.union([z.iso.date(), z.literal('')]).catch(''),
  search: z.string().trim().max(100).catch(''),
}).strict();
export type ServiceAppointmentFilters = z.infer<
  typeof serviceAppointmentFiltersSchema
>;

export const serviceAppointmentIdSchema = z.string().uuid();

export const assignedServiceAppointmentStatusSchema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum(['in_service', 'ready_for_pickup', 'completed']),
}).strict();

export const serviceAppointmentNoteSchema = z.object({
  appointmentId: z.string().uuid(),
  note: z.string().trim().max(4000),
}).strict();

export const serviceAppointmentCancellationRequestSchema = z.object({
  appointmentId: z.string().uuid(),
  subject: z.string().trim().min(3).max(120),
  reason: z.string().trim().min(10).max(1500),
}).strict();

export const serviceAppointmentCancellationReviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
}).strict();
