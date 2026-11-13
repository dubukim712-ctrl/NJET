import type { Json } from './database';
import type {
  ProductType,
  ServiceAppointmentMode,
  ServiceAppointmentStatus,
  ServiceAppointmentType,
} from './commerce-tables';

export type DatabaseStorefrontFunctions = {
  storefront_catalog: {
    Args: { p_slug?: string | null; p_variant_ids?: string[] | null };
    Returns: {
      product_id: string;
      product_slug: string;
      product_name: string;
      product_description: string;
      product_type: ProductType;
      category_id: string;
      category_name: string | null;
      subcategory_id: string | null;
      subcategory_name: string | null;
      product_image_path: string | null;
      is_demo: boolean;
      variant_id: string | null;
      variant_name: string | null;
      sku: string | null;
      price_minor: number | null;
      reservation_minor: number | null;
      home_credit_downpayment_minor: number | null;
      variant_image_path: string | null;
      specifications: Json | null;
    }[];
  };
  storefront_branch_options: {
    Args: Record<PropertyKey, never>;
    Returns: { id: string; name: string }[];
  };
  storefront_branch_locations: {
    Args: Record<PropertyKey, never>;
    Returns: {
      id: string;
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
    }[];
  };
  storefront_variant_availability: {
    Args: { p_variant_ids: string[] };
    Returns: {
      variant_id: string;
      branch_id: string;
      available: boolean;
      stock: number | null;
    }[];
  };
  request_service_appointment: {
    Args: {
      p_branch_id: string;
      p_service_mode: ServiceAppointmentMode;
      p_service_type: ServiceAppointmentType;
      p_bike_make: string;
      p_bike_model: string;
      p_bike_serial_number: string | null;
      p_issue_description: string;
      p_address_line1: string | null;
      p_barangay: string | null;
      p_city: string | null;
      p_province: string | null;
      p_postal_code: string | null;
      p_contact_number: string;
      p_preferred_start_at: string;
    };
    Returns: string;
  };
  customer_service_appointments: {
    Args: Record<PropertyKey, never>;
    Returns: {
      id: string;
      appointment_number: string;
      branch_name: string;
      service_mode: ServiceAppointmentMode;
      service_type: ServiceAppointmentType;
      bike_make: string;
      bike_model: string;
      issue_description: string;
      address_line1: string | null;
      barangay: string | null;
      city: string | null;
      province: string | null;
      preferred_start_at: string;
      scheduled_at: string | null;
      status: ServiceAppointmentStatus;
      estimate_minor: number | null;
      final_total_minor: number | null;
      created_at: string;
    }[];
  };
  customer_service_appointment_cancellation_requests: {
    Args: Record<PropertyKey, never>;
    Returns: {
      appointment_id: string;
      subject: string;
      reason: string;
      status: 'pending' | 'approved' | 'rejected';
      created_at: string;
    }[];
  };
  request_service_appointment_cancellation: {
    Args: { p_appointment_id: string; p_subject: string; p_reason: string };
    Returns: string;
  };
  review_service_appointment_cancellation: {
    Args: { p_request_id: string; p_decision: string };
    Returns: undefined;
  };
  save_branch_service_hours: {
    Args: { p_branch_id: string; p_hours: Json };
    Returns: undefined;
  };
  customer_service_appointment_availability: {
    Args: { p_branch_id: string; p_slot_start: string };
    Returns: {
      branch_name: string;
      hours_configured: boolean;
      branch_open: boolean;
      closure_active: boolean;
      technician_id: string | null;
      technician_name: string | null;
      technician_available: boolean;
    }[];
  };
  customer_service_appointment_slots: {
    Args: { p_branch_id: string; p_date: string };
    Returns: {
      hours_configured: boolean;
      branch_open: boolean;
      slot_time: string | null;
    }[];
  };
  customer_service_appointment_closures: {
    Args: { p_branch_id: string; p_date: string };
    Returns: {
      starts_at: string;
      ends_at: string;
    }[];
  };
  service_appointment_branch_options: {
    Args: Record<PropertyKey, never>;
    Returns: { id: string; name: string }[];
  };
  service_appointment_technician_options: {
    Args: { p_branch_id: string };
    Returns: { id: string; name: string }[];
  };
  service_appointment_technician_names: {
    Args: { p_technician_ids: string[] };
    Returns: { id: string; name: string }[];
  };
  set_assigned_service_appointment_status: {
    Args: { p_appointment_id: string; p_status: string };
    Returns: undefined;
  };
};
