import type { createClient } from '@/data/supabase/server';
import type { Database } from '@/types/database';
import type { ServiceAppointmentFilters } from '@/lib/validations/service-appointments';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ServiceAppointment =
  Database['public']['Tables']['service_appointments']['Row'];
type CustomerAppointment =
  Database['public']['Functions']['customer_service_appointments']['Returns'][number];

export type StaffServiceAppointment = Pick<
  ServiceAppointment,
  | 'id'
  | 'appointment_number'
  | 'customer_name'
  | 'contact_number'
  | 'branch_id'
  | 'branch_name'
  | 'service_mode'
  | 'service_type'
  | 'bike_make'
  | 'bike_model'
  | 'bike_serial_number'
  | 'issue_description'
  | 'address_line1'
  | 'barangay'
  | 'city'
  | 'province'
  | 'postal_code'
  | 'preferred_start_at'
  | 'scheduled_at'
  | 'status'
  | 'assigned_technician_id'
  | 'estimate_minor'
  | 'final_total_minor'
> & {
  internal_note: string;
  assigned_technician_name: string | null;
  cancellation_request: {
    id: string;
    subject: string;
    reason: string;
    created_at: string;
  } | null;
};

export async function getCustomerServiceAppointments(
  supabase: SupabaseClient
): Promise<{
  data: (CustomerAppointment & {
    cancellation_request: {
      subject: string;
      reason: string;
      status: 'pending' | 'approved' | 'rejected';
      created_at: string;
    } | null;
  })[] | null;
  error: string | null;
}> {
  try {
    const [appointmentsResult, requestsResult] = await Promise.all([
      supabase.rpc('customer_service_appointments'),
      supabase.rpc('customer_service_appointment_cancellation_requests'),
    ]);
    if (appointmentsResult.error) throw appointmentsResult.error;
    if (requestsResult.error) throw requestsResult.error;
    const requestsByAppointment = new Map(
      requestsResult.data.map((request) => [request.appointment_id, request])
    );
    return {
      data: appointmentsResult.data.map((appointment) => {
        const request = requestsByAppointment.get(appointment.id);
        return {
          ...appointment,
          cancellation_request: request
            ? {
                subject: request.subject,
                reason: request.reason,
                status: request.status,
                created_at: request.created_at,
              }
            : null,
        };
      }),
      error: null,
    };
  } catch (error) {
    console.error('Could not load customer service appointments.', error);
    return {
      data: null,
      error: 'Your service appointments could not be loaded. Please try again later.',
    };
  }
}

export async function getStaffServiceAppointments(
  supabase: SupabaseClient,
  filters: ServiceAppointmentFilters,
  canManage: boolean
): Promise<{ data: StaffServiceAppointment[] | null; error: string | null }> {
  try {
    let query = supabase
      .from('service_appointments')
      .select(`
        id, appointment_number, customer_name, contact_number, branch_id, branch_name,
        service_mode, service_type, bike_make, bike_model, bike_serial_number,
        issue_description, address_line1, barangay, city, province, postal_code,
        preferred_start_at, scheduled_at, status, assigned_technician_id,
        estimate_minor, final_total_minor
      `)
      .order('scheduled_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.branchId) query = query.eq('branch_id', filters.branchId);
    const searchTerm = filters.search.replace(/[%,()_"\\]/g, ' ').trim();
    if (searchTerm) {
      query = query.or(
        `appointment_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%,bike_make.ilike.%${searchTerm}%,bike_model.ilike.%${searchTerm}%,bike_serial_number.ilike.%${searchTerm}%,branch_name.ilike.%${searchTerm}%`
      );
    }
    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00+08:00`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      query = query
        .gte('scheduled_at', start.toISOString())
        .lt('scheduled_at', end.toISOString());
    }

    const { data: appointments, error } = await query;
    if (error) throw error;
    if (!appointments.length) return { data: [], error: null };

    const ids = appointments.map((appointment) => appointment.id);
    const technicianIds = [
      ...new Set(
        appointments.flatMap((appointment) =>
          appointment.assigned_technician_id
            ? [appointment.assigned_technician_id]
            : []
        )
      ),
    ];
    const [notesResult, techniciansResult, cancellationRequestsResult] = await Promise.all([
      supabase
        .from('service_appointment_internal_notes')
        .select('appointment_id, note')
        .in('appointment_id', ids),
      technicianIds.length
        ? supabase.rpc('service_appointment_technician_names', {
            p_technician_ids: technicianIds,
          })
        : Promise.resolve({ data: [], error: null }),
      canManage
        ? supabase
            .from('service_appointment_cancellation_requests')
            .select('id, appointment_id, subject, reason, created_at')
            .eq('status', 'pending')
            .in('appointment_id', ids)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (notesResult.error) throw notesResult.error;
    if (techniciansResult.error) throw techniciansResult.error;
    if (cancellationRequestsResult.error) throw cancellationRequestsResult.error;

    const noteById = new Map(
      notesResult.data.map((entry) => [entry.appointment_id, entry.note])
    );
    const nameById = new Map(
      (techniciansResult.data ?? []).map((technician) => [
        technician.id,
        technician.name,
      ])
    );
    const cancellationRequestByAppointment = new Map(
      cancellationRequestsResult.data.map((request) => [
        request.appointment_id,
        request,
      ])
    );
    return {
      data: appointments.map((appointment) => ({
        ...appointment,
        internal_note: noteById.get(appointment.id) ?? '',
        assigned_technician_name: appointment.assigned_technician_id
          ? nameById.get(appointment.assigned_technician_id) ?? null
          : null,
        cancellation_request:
          cancellationRequestByAppointment.get(appointment.id) ?? null,
      })),
      error: null,
    };
  } catch (error) {
    console.error('Could not load staff service appointments.', error);
    return {
      data: null,
      error: 'Service appointments could not be loaded. Please try again later.',
    };
  }
}
