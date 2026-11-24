import 'server-only';

import { after } from 'next/server';
import { createServiceClient } from '@/data/supabase/service';
import { formatAppointmentBikeName } from '@/lib/appointment-bike-name';
import { getCustomerEmailSiteUrl } from '@/lib/site-url';
import { deliverBrevoEmail } from './brevo-email.mjs';
import { buildAppointmentStatusEmail, type AppointmentEmailEvent } from './appointment-status-email-content';

type Notification =
  | { id: string; event: 'confirmed' | 'rescheduled'; scheduledAt: string }
  | { id: string; event: Extract<AppointmentEmailEvent, 'approved' | 'rejected'> };

export function queueAppointmentStatusEmail(notification: Notification) {
  try {
    after(() => deliverBrevoEmail({
      label: 'Appointment status email',
      apiKey: process.env.BREVO_API_KEY?.trim(),
      senderEmail: process.env.BREVO_SENDER_EMAIL?.trim(),
      prepare: async (sender) => {
        const { data, error } = await createServiceClient()
          .rpc('appointment_status_email_details', {
            p_id: notification.id,
            p_event: notification.event,
            p_scheduled_at: 'scheduledAt' in notification ? notification.scheduledAt : null,
          })
          .maybeSingle();
        if (error) {
          console.warn('Appointment status email lookup failed in Supabase.', error.code);
          return null;
        }
        if (!data) return null;
        const bikeName = formatAppointmentBikeName(data.bike_make, data.bike_model);
        return buildAppointmentStatusEmail(notification.event, data, bikeName, sender, getCustomerEmailSiteUrl());
      },
    }));
  } catch {
    console.warn('Appointment status email could not be scheduled.');
  }
}
