import type {
  Fulfillment,
  OrderPaymentMethod,
  OrderPaymentTransactionType,
  OrderPhoneVerificationStatus,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  ProductType,
} from './commerce-tables';

export type Order = {
  id: string;
  order_number: string;
  customer_id: string | null;
  order_source: 'online' | 'walk_in';
  cash_tendered_minor: number | null;
  customer_name: string;
  contact_number: string;
  phone_verification_status: OrderPhoneVerificationStatus;
  phone_verified_at: string | null;
  phone_verified_by: string | null;
  fulfillment: Fulfillment;
  branch_id: string | null;
  branch_name: string;
  delivery_zone_id: string | null;
  delivery_zone_name: string | null;
  address_line1: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  payment_method: PaymentMethod;
  payment_provider: PaymentProvider | null;
  payment_recipient_id: string | null;
  payment_reference: string | null;
  payment_expires_at: string | null;
  status: OrderStatus;
  total_minor: number;
  discount_total_minor: number;
  applied_coupon_code: string | null;
  delivery_fee_minor: number;
  reservation_due_minor: number;
  balance_due_minor: number;
  online_due_minor: number;
  home_credit_downpayment_due_minor: number;
  terms_version: string | null;
  return_policy_version: string | null;
  privacy_version: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  sales_agent_id: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  variant_id: string;
  product_name: string;
  product_type: ProductType;
  variant_name: string;
  sku: string;
  quantity: number;
  unit_price_minor: number;
  regular_unit_price_minor: number;
  discount_unit_minor: number;
  applied_discount_id: string | null;
  discount_name_snapshot: string | null;
  discount_code_snapshot: string | null;
  unit_cost_minor: number | null;
  cost_total_minor: number | null;
  reservation_unit_minor: number;
  created_at: string;
};

export type OrderPaymentTransaction = {
  id: string;
  order_id: string;
  transaction_type: OrderPaymentTransactionType;
  payment_method: OrderPaymentMethod;
  payment_provider: PaymentProvider | null;
  amount_minor: number;
  is_downpayment: boolean;
  reference: string | null;
  note: string | null;
  source_event: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type OrderDocument = {
  id: string;
  order_id: string;
  kind: 'payment_proof' | 'identity';
  object_path: string;
  content_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
};

export type OrderInvoice = {
  id: string;
  order_id: string;
  invoice_no: string;
  created_at: string;
  updated_at: string;
};

export type OrderCertificate = {
  id: string;
  order_id: string;
  certificate_number: string;
  object_path: string;
  content_type: string;
  file_size: number;
  generated_by: string | null;
  template_version: string;
  generated_at: string;
};

export type OrderHomeCreditDetails = {
  order_id: string;
  home_credit_acc_no: string;
  downpayment_minor: number;
  terms_months: number;
  monthly_payment_minor: number;
  recorded_by: string | null;
  created_at: string;
};

export type PaymentRecipient = {
  id: string;
  provider: PaymentProvider;
  recipient_name: string;
  account_details: string;
  payment_qr_path: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type OwnershipCertificateTemplate = {
  id: number;
  object_path: string;
  template_version: string;
  created_at: string;
  updated_at: string;
};
