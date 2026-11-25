import type { ReturnDisposition, ReturnReason } from '@/lib/warranty-returns';
import type { DatabaseStorefrontFunctions } from './database-functions-storefront';

export type WarrantyDecision = 'under_review' | 'covered_repair' | 'replacement_approved' | 'paid_repair' | 'further_review';

export type WarrantyUnit = {
  unit_id: string;
  model: string;
  serial: string;
  handover_on: string | null;
  wheel_count: number | null;
};

export type CustomerWarrantyBike = WarrantyUnit & { deadline: string | null };

export type WarrantyDetails = {
  appointment_id: string;
  submitted_at: string;
  decision: WarrantyDecision;
  decision_note: string | null;
  order_number: string | null;
  original_serial: string | null;
  handover_on: string | null;
  wheel_count: number | null;
  deadline: string | null;
  timing: 'needs_review' | 'within_window' | 'after_window';
  replacement_serial: string | null;
  replacement_handover_on: string | null;
  decided_at: string | null;
  approver: string | null;
  unit_id: string | null;
};

export type WarrantyExchange = {
  appointment_id: string;
  appointment_number: string;
  customer_name: string;
  order_number: string;
  branch_name: string;
  product_name: string;
  original_serial: string;
  replacement_serial: string | null;
  returned_condition: string | null;
  received_at: string;
  reserved_at: string | null;
  completed_at: string | null;
  replacement_handover_on: string | null;
};

export type WarrantyExchangeOperation = 'receive' | 'reserve' | 'release' | 'handover';

export type WarrantyReturn = {
  appointment_id: string;
  appointment_number: string;
  branch_name: string;
  product_name: string;
  original_serial: string;
  returned_condition: string;
  received_at: string;
  reason: ReturnReason | null;
  disposition: ReturnDisposition | null;
  note: string | null;
  recorded_at: string | null;
  recorded_by: string | null;
  update_id: string | null;
};

export type ServiceWarrantyFunctions = {
  list_warranty_returns: {
    Args: { p_before_at: string | null; p_before_id: string | null }; Returns: WarrantyReturn[];
  };
  record_warranty_return_update: {
    Args: { p_appointment_id: string; p_reason: ReturnReason; p_disposition: ReturnDisposition; p_note: string; p_previous_id: string | null };
    Returns: boolean;
  };
  service_warranty_exchange_details: {
    Args: { p_appointment_id: string }; Returns: WarrantyExchange[];
  };
  service_warranty_replacement_options: {
    Args: { p_appointment_id: string }; Returns: { serial: string; motor: string }[];
  };
  manage_service_warranty_exchange: {
    Args: { p_appointment_id: string; p_operation: WarrantyExchangeOperation; p_value: string | null; p_handover_on: string | null; p_original_serial: string | null };
    Returns: undefined;
  };
  order_warranty_units: { Args: { p_order_id: string }; Returns: WarrantyUnit[] };
  record_ebike_warranty_handover: {
    Args: { p_order_id: string; p_unit_id: string; p_handover_on: string; p_wheel_count: number }; Returns: undefined;
  };
  customer_warranty_bikes: { Args: Record<PropertyKey, never>; Returns: CustomerWarrantyBike[] };
  request_service_warranty_appointment: {
    Args: { p_booking: DatabaseStorefrontFunctions['request_service_appointment']['Args']; p_unit_id: string | null };
    Returns: string;
  };
  start_service_warranty_review: { Args: { p_appointment_id: string }; Returns: string };
  service_warranty_details: { Args: { p_appointment_id: string }; Returns: WarrantyDetails[] };
  review_service_warranty: {
    Args: { p_appointment_id: string; p_decision: Exclude<WarrantyDecision, 'under_review'>; p_note: string }; Returns: undefined;
  };
  link_service_warranty_unit: { Args: { p_appointment_id: string; p_serial: string }; Returns: undefined };
  record_service_warranty_replacement: {
    Args: { p_appointment_id: string; p_serial: string; p_handover_on: string }; Returns: undefined;
  };
  staff_warranty_appointment_ids: { Args: { p_appointment_ids: string[] }; Returns: { appointment_id: string }[] };
};
