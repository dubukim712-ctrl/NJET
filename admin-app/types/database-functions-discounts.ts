import type { Json } from './database';
import type { PaymentMethod, PaymentProvider } from './commerce-tables';

export type DatabaseDiscountFunctions = {
  create_commerce_order_with_discount: {
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
      p_return_policy_version: string;
      p_privacy_version: string;
      p_terms_accepted: boolean;
      p_privacy_accepted: boolean;
      p_items: Json;
      p_documents: Json;
      p_coupon_code: string | null;
    };
    Returns: string;
  };
  active_variant_discounts: {
    Args: { p_variant_ids: string[] | null; p_channel: string };
    Returns: {
      variant_id: string;
      list_price_minor: number;
      unit_price_minor: number;
      discount_unit_minor: number;
      discount_id: string | null;
      discount_name: string | null;
    }[];
  };
  preview_product_discount_cart: {
    Args: {
      p_items: Json;
      p_coupon_code: string | null;
      p_channel: string;
      p_phone?: string | null;
    };
    Returns: {
      variant_id: string;
      quantity: number;
      list_price_minor: number;
      unit_price_minor: number;
      discount_unit_minor: number;
      discount_id: string | null;
      discount_name: string | null;
      discount_code: string | null;
    }[];
  };
  admin_product_discounts: {
    Args: Record<PropertyKey, never>;
    Returns: Json;
  };
  save_product_discount: {
    Args: {
      p_discount_id: string | null;
      p_name: string;
      p_discount_type: 'percentage' | 'fixed';
      p_value: number;
      p_coupon_code: string | null;
      p_starts_at: string | null;
      p_ends_at: string | null;
      p_max_redemptions: number | null;
      p_active: boolean;
      p_targets: Json;
    };
    Returns: string;
  };
  create_walk_in_sale_with_discount: {
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
      p_coupon_code: string | null;
    };
    Returns: string;
  };
  create_walk_in_home_credit_sale_with_discount: {
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
      p_coupon_code: string | null;
    };
    Returns: string;
  };
};
