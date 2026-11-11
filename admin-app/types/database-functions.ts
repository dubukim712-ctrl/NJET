import type { Json } from './database';
import type { RoleScope } from './rbac';
import type {
  PaymentMethod,
  PaymentProvider,
  ProductType,
  ServiceAppointmentMode,
  ServiceAppointmentStatus,
  ServiceAppointmentType,
} from './commerce-tables';

export type DatabaseFunctions = {
  assign_user_role: {
    Args: { p_user_id: string; p_role_id: string };
    Returns: undefined;
  };
  assign_user_branch: {
    Args: { p_user_id: string; p_branch_id: string | null };
    Returns: undefined;
  };
  user_branch_options: {
    Args: Record<PropertyKey, never>;
    Returns: { id: string; name: string; active: boolean }[];
  };
  transfer_branch_options: {
    Args: Record<PropertyKey, never>;
    Returns: { id: string; name: string; active: boolean }[];
  };
  create_role: {
    Args: {
      p_slug: string;
      p_name: string;
      p_description: string | null;
      p_scope: RoleScope;
      p_permission_keys: string[];
    };
    Returns: string;
  };
  set_role_permissions: {
    Args: { p_role_id: string; p_permission_keys: string[] };
    Returns: undefined;
  };
  clear_audit_logs: {
    Args: { p_ids?: string[] | null };
    Returns: number;
  };
  create_commerce_order_with_recipient: {
    Args: {
      p_customer_name: string;
      p_contact_number: string;
      p_fulfillment: string;
      p_branch_id: string | null;
      p_delivery_zone_id: string | null;
      p_address_line1: string | null;
      p_barangay: string | null;
      p_city: string | null;
      p_province: string | null;
      p_postal_code: string | null;
      p_payment_method: string;
      p_payment_provider: string | null;
      p_payment_recipient_id: string | null;
      p_payment_reference: string | null;
      p_terms_version: string;
      p_privacy_version: string;
      p_terms_accepted: boolean;
      p_privacy_accepted: boolean;
      p_items: Json;
      p_documents: Json;
    };
    Returns: string;
  };
  customer_order_payment_details: {
    Args: { p_order_id: string };
    Returns: {
      order_id: string;
      order_number: string;
      payment_method: string;
      status: string;
      total_minor: number;
      payment_due_minor: number;
      payment_expires_at: string | null;
      payment_provider: string;
      payment_reference: string | null;
      recipient_name: string;
      account_details: string;
      payment_qr_path: string;
      has_payment_proof: boolean;
    }[];
  };
  attach_order_payment_proof: {
    Args: {
      p_order_id: string;
      p_object_path: string;
      p_payment_reference: string | null;
    };
    Returns: { previous_object_path: string | null; expired: boolean }[];
  };
  walk_in_branch_options: {
    Args: Record<PropertyKey, never>;
    Returns: { id: string; name: string }[];
  };
  walk_in_catalog: {
    Args: { p_branch_id: string };
    Returns: {
      product_id: string;
      product_name: string;
      product_type: ProductType;
      product_image_path: string | null;
      variant_id: string;
      variant_name: string;
      sku: string;
      price_minor: number;
      variant_image_path: string | null;
      stock: number;
    }[];
  };
  create_walk_in_sale: {
    Args: {
      p_customer_name: string;
      p_contact_number: string;
      p_branch_id: string;
      p_payment_method: PaymentMethod;
      p_payment_provider: PaymentProvider | null;
      p_payment_reference: string | null;
      p_cash_tendered_minor: number | null;
      p_address_line1: string | null;
      p_barangay: string | null;
      p_city: string | null;
      p_province: string | null;
      p_postal_code: string | null;
      p_items: Json;
    };
    Returns: string;
  };
  create_walk_in_home_credit_sale: {
    Args: {
      p_customer_name: string;
      p_contact_number: string;
      p_branch_id: string;
      p_address_line1: string | null;
      p_barangay: string | null;
      p_city: string | null;
      p_province: string | null;
      p_postal_code: string | null;
      p_items: Json;
      p_home_credit_acc_no: string;
      p_downpayment_minor: number;
      p_terms_months: number;
      p_monthly_payment_minor: number;
    };
    Returns: string;
  };
  confirm_commerce_order: {
    Args: { p_order_id: string };
    Returns: undefined;
  };
  cancel_commerce_order: {
    Args: { p_order_id: string };
    Returns: undefined;
  };
  complete_commerce_order: {
    Args: { p_order_id: string };
    Returns: undefined;
  };
  complete_commerce_order_with_home_credit: {
    Args: {
      p_order_id: string;
      p_home_credit_acc_no: string;
      p_downpayment_minor: number;
      p_terms_months: number;
      p_monthly_payment_minor: number;
    };
    Returns: undefined;
  };
  save_order_invoice: {
    Args: { p_order_id: string; p_invoice_no: string };
    Returns: undefined;
  };
  save_order_certificate: {
    Args: {
      p_order_id: string;
      p_object_path: string;
      p_file_size: number;
      p_template_version: string;
    };
    Returns: undefined;
  };
  save_batch_inventory: {
    Args: { p_branch_id: string; p_variant_id: string; p_stock: number };
    Returns: undefined;
  };
  register_ebike_units: {
    Args: { p_branch_id: string; p_variant_id: string; p_units: Json };
    Returns: undefined;
  };
  available_ebike_stock: {
    Args: { p_variant_ids: string[] };
    Returns: { variant_id: string; branch_id: string; stock: number }[];
  };
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
  dispatch_branch_transfer: {
    Args: {
      p_source_branch_id: string;
      p_destination_branch_id: string;
      p_items: Json;
      p_note: string | null;
    };
    Returns: string;
  };
  receive_branch_transfer: {
    Args: { p_transfer_id: string };
    Returns: undefined;
  };
  current_user_has_permission: {
    Args: { p_key: string };
    Returns: boolean;
  };
  current_user_is_branch_scoped: {
    Args: Record<PropertyKey, never>;
    Returns: boolean;
  };
  current_user_branch_id: {
    Args: Record<PropertyKey, never>;
    Returns: string | null;
  };
  current_user_can_access_branch: {
    Args: { p_branch_id: string | null };
    Returns: boolean;
  };
  current_user_is_full_access: {
    Args: Record<PropertyKey, never>;
    Returns: boolean;
  };
  current_user_permissions: {
    Args: Record<PropertyKey, never>;
    Returns: string[];
  };
  role_permission_keys: {
    Args: { p_role_id: string };
    Returns: string[];
  };
  current_user_role: {
    Args: Record<PropertyKey, never>;
    Returns: string;
  };
  current_user_is_admin: {
    Args: Record<PropertyKey, never>;
    Returns: boolean;
  };
  current_user_is_super_admin: {
    Args: Record<PropertyKey, never>;
    Returns: boolean;
  };
  handle_new_user: {
    Args: Record<PropertyKey, never>;
    Returns: undefined;
  };
  handle_updated_at: {
    Args: Record<PropertyKey, never>;
    Returns: undefined;
  };
  log_audit_event: {
    Args: Record<PropertyKey, never>;
    Returns: undefined;
  };
};
