export type ServiceAppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'in_service'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled'
  | 'no_show';
export type ServiceAppointmentMode = 'branch_visit' | 'home_service';
export type ServiceAppointmentType = 'maintenance' | 'repair' | 'inspection' | 'other';
export type ServiceAppointmentCancellationRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type ServiceAppointment = {
  id: string;
  appointment_number: string;
  customer_id: string | null;
  customer_name: string;
  contact_number: string;
  branch_id: string;
  branch_name: string;
  service_mode: ServiceAppointmentMode;
  service_type: ServiceAppointmentType;
  bike_make: string;
  bike_model: string;
  bike_serial_number: string | null;
  issue_description: string;
  address_line1: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  preferred_start_at: string;
  scheduled_at: string | null;
  status: ServiceAppointmentStatus;
  assigned_technician_id: string | null;
  estimate_minor: number | null;
  final_total_minor: number | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceAppointmentInternalNote = {
  appointment_id: string;
  note: string;
  updated_by: string;
  updated_at: string;
};

export type ServiceAppointmentCancellationRequest = {
  id: string;
  appointment_id: string;
  customer_id: string;
  subject: string;
  reason: string;
  status: ServiceAppointmentCancellationRequestStatus;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

export type BranchServiceHour = {
  branch_id: string;
  day_of_week: number;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type ServiceAppointmentClosure = {
  id: string;
  branch_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  created_by: string;
  created_at: string;
};
