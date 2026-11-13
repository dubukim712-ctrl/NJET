import type { Json } from './database';
import type { RoleScope } from './rbac';
import type {
  PaymentMethod,
  PaymentProvider,
  ProductType,
  ProductVariant,
} from './commerce-tables';

export type DatabaseCommerceFunctions = {
  admin_product_variants: {
    Args: Record<PropertyKey, never>;
    Returns: ProductVariant[];
  };
  admin_inventory_valuation: {
    Args: {
      p_branch_id: string | null;
      p_page: number;
      p_page_size: number;
    };
    Returns: Json;
  };
  create_inventory_receipt: {
    Args: {
      p_branch_id: string;
      p_supplier_name: string;
      p_document_reference: string | null;
      p_received_at: string;
      p_shared_cost_minor: number;
      p_items: Json;
    };
    Returns: string;
  };
  admin_order_sales_report: {
    Args: {
      p_start_at: string;
      p_end_at: string;
      p_compare_start_at: string;
      p_compare_end_at: string;
      p_branch_id: string | null;
      p_agent_id: string | null;
      p_granularity: 'hour' | 'day' | 'month';
    };
    Returns: Json;
  };
  admin_order_sales_report_options: {
    Args: Record<PropertyKey, never>;
    Returns: Json;
  };
  admin_order_sales_report_rows: {
    Args: {
      p_start_at: string;
      p_end_at: string;
      p_branch_id: string | null;
      p_agent_id: string | null;
      p_search: string | null;
      p_page: number;
      p_page_size: number;
    };
    Returns: Json;
  };
  admin_order_sales_report_export: {
    Args: {
      p_start_at: string;
      p_end_at: string;
      p_branch_id: string | null;
      p_agent_id: string | null;
      p_search: string | null;
    };
    Returns: Json;
  };
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
  complete_commerce_order_with_payment: {
    Args: {
      p_order_id: string;
      p_amount_minor: number;
      p_payment_method: 'cash' | 'online' | 'other' | null;
      p_payment_provider: PaymentProvider | null;
      p_reference: string | null;
    };
    Returns: undefined;
  };
  record_order_payment_transaction: {
    Args: {
      p_order_id: string;
      p_transaction_type: 'collection' | 'refund';
      p_payment_method: 'cash' | 'online' | 'home_credit' | 'other';
      p_payment_provider: PaymentProvider | null;
      p_amount_minor: number;
      p_reference: string | null;
      p_note: string | null;
      p_is_downpayment: boolean;
    };
    Returns: string;
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
};
