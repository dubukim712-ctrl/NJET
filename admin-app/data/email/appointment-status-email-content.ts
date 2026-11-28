import { escapeEmailHtml } from './brevo-email.mjs';

export type AppointmentEmailEvent = 'confirmed' | 'rescheduled' | 'approved' | 'rejected';

export type AppointmentEmailDetails = {
  email: string;
  appointment_id: string;
  appointment_number: string;
  customer_name: string;
  branch_name: string;
  scheduled_at: string | null;
  service_type: string;
  service_mode: string;
  bike_make: string;
  bike_model: string;
  bike_serial_number: string | null;
  response_note?: string | null;
};

const headings = {
  confirmed: 'Service appointment confirmed',
  rescheduled: 'Service appointment rescheduled',
  approved: 'Appointment cancellation approved',
  rejected: 'Appointment cancellation rejected',
};

const dateFormat = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'long', timeZone: 'Asia/Manila',
});
const timeFormat = new Intl.DateTimeFormat('en-PH', {
  hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila',
});

function appointmentMessage(event: AppointmentEmailEvent, details: AppointmentEmailDetails, bikeName: string) {
  if (event === 'approved' || event === 'rejected') {
    const note = details.response_note?.trim();
    return [
      event === 'approved'
        ? 'Your request was approved. Your appointment has been cancelled.'
        : 'Your request was rejected. Please keep your appointment as scheduled and check the appointment details for its latest status.',
      ...(note ? ['Staff response: ' + note] : []),
    ];
  }

  const start = new Date(details.scheduled_at ?? '');
  const end = new Date(start.getTime() + 30 * 60_000);
  const service = details.service_type.charAt(0).toUpperCase() + details.service_type.slice(1);
  return [
    'Branch: ' + details.branch_name,
    'Scheduled slot: ' + dateFormat.format(start) + ', ' +
      timeFormat.format(start) + ' to ' + timeFormat.format(end) + ' (Philippine time)',
    'Service: ' + service + ' (' + (details.service_mode === 'home_service' ? 'Home service' : 'Branch visit') + ')',
    'Product / E-bike: ' + bikeName,
    ...(details.bike_serial_number ? ['Serial number: ' + details.bike_serial_number] : []),
  ];
}

export function buildAppointmentStatusEmail(
  event: AppointmentEmailEvent,
  details: AppointmentEmailDetails,
  bikeName: string,
  sender: string,
  siteOrigin: string,
) {
  const heading = headings[event];
  const href = new URL('/appointments/' + encodeURIComponent(details.appointment_id), siteOrigin).href;
  const lines = [
    'Hi ' + (details.customer_name.trim() || 'Valued Customer') + ',',
    'Appointment ' + details.appointment_number,
    ...appointmentMessage(event, details, bikeName),
  ];
  return {
    sender: { email: sender, name: 'NJET' },
    to: [{ email: details.email }],
    subject: heading + ' - ' + details.appointment_number,
    textContent: [heading, ...lines, 'View appointment details: ' + href].join('\n\n'),
    htmlContent: [
      '<div style="max-width:520px;margin:auto;padding:20px;font:16px/1.6 Arial,sans-serif;color:#17242c">',
      '<h1 style="font-size:26px;color:#07634e">' + heading + '</h1>',
      ...lines.map((line) => '<p>' + escapeEmailHtml(line) + '</p>'),
      '<p><a style="display:inline-block;padding:12px 18px;border-radius:8px;background:#07634e;color:#fff" href="' +
        escapeEmailHtml(href) + '">View appointment details</a></p>',
      '</div>',
    ].join(''),
  };
}
