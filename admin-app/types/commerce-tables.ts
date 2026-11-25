import type {
  Order,
  OrderCertificate,
  OrderDocument,
  OrderHomeCreditDetails,
  OrderInvoice,
  OrderItem,
  OrderPaymentTransaction,
  OwnershipCertificateTemplate,
  PaymentRecipient,
} from './commerce-order-tables';
import type {
  BranchServiceHour,
  ServiceAppointment,
  ServiceAppointmentCancellationRequest,
  ServiceAppointmentClosure,
  ServiceAppointmentInternalNote,
} from './service-appointment-tables';

export type {
  ServiceAppointmentCancellationRequestStatus,
  ServiceAppointmentMode,
  ServiceAppointmentStatus,
  ServiceAppointmentType,
} from './service-appointment-tables';

export type {
  Order,
  OrderItem,
  OrderPaymentTransaction,
} from './commerce-order-tables';

export type ProductType = 'ebike' | 'part' | 'accessory';
export type Fulfillment = 'pickup' | 'delivery';
export type PaymentMethod = 'cash' | 'online' | 'home_credit';
export type PaymentProvider = 'gcash' | 'bank_transfer' | 'card';
export type OrderPaymentMethod = PaymentMethod | 'other';
export type OrderPaymentTransactionType = 'collection' | 'refund' | 'financing';
export type OrderStatus =
  | 'awaiting_payment'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'expired'
  | 'completed';
export type OrderPhoneVerificationStatus =
  | 'not_required'
  | 'otp_verified'
  | 'manual_pending'
  | 'manual_verified';
type Table<Row, Relationships = []> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: Relationships;
};

type Timestamped = {
  created_at: string;
  updated_at: string;
  is_demo: boolean;
};

type Branch = Timestamped & {
  id: string;
  slug: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
};

type Product = Timestamped & {
  id: string;
  slug: string;
  name: string;
  description: string;
  product_type: ProductType;
  category_id: string;
  subcategory_id: string | null;
  image_path: string | null;
  active: boolean;
};

type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  tracks_serial_inventory: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  specifications: Record<string, string> | null;
  price_minor: number;
  cost_minor: number | null;
  reservation_minor: number;
  home_credit_downpayment_minor: number;
  image_path: string | null;
  active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

type BranchInventory = {
  branch_id: string;
  variant_id: string;
  stock: number;
  updated_at: string;
};

type ProductSubcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type EbikeUnit = {
  id: string;
  variant_id: string;
  branch_id: string;
  serial_number: string | null;
  motor_number: string | null;
  status: 'needs_identification' | 'in_stock' | 'in_transit' | 'sold' | 'warranty_reserved' | 'warranty_replacement';
  order_item_id: string | null;
  transfer_id: string | null;
  created_at: string;
};

type InventoryMovement = {
  id: string;
  branch_id: string;
  variant_id: string;
  quantity_delta: number;
  movement_type: 'opening_balance' | 'adjustment' | 'order_confirmed'
    | 'order_cancelled' | 'serial_identified' | 'serial_stock_received'
    | 'stock_received' | 'transfer_dispatched' | 'transfer_received'
    | 'warranty_return_received' | 'warranty_replacement_reserved' | 'warranty_reservation_released' | 'warranty_replacement_handed_over';
  reference_id: string | null;
  note: string | null;
  actor_id: string | null;
  created_at: string;
};

type BranchTransfer = {
  id: string;
  source_branch_id: string;
  destination_branch_id: string;
  status: 'in_transit' | 'received';
  note: string | null;
  dispatched_by: string;
  dispatched_at: string;
  received_by: string | null;
  received_at: string | null;
};

type BranchTransferItem = {
  id: string;
  transfer_id: string;
  variant_id: string;
  quantity: number;
};

type BranchTransferUnit = {
  transfer_item_id: string;
  unit_id: string;
};

type DeliveryZone = Timestamped & {
  id: string;
  name: string;
  fee_minor: number;
  active: boolean;
};

export type BusinessSettings = {
  id: number;
  business_name: string;
  phone: string;
  phone_verification_required: boolean;
  email: string;
  address: string;
  logo_path: string | null;
  about_image_path: string | null;
  business_hours: string;
  created_at: string;
  updated_at: string;
};

type StorefrontLegalPolicyVersion = {
  id: number;
  slug: 'terms' | 'return-policy' | 'privacy';
  version: string;
  intro: string;
  sections: {
    id: string;
    title: string;
    summary: string;
    paragraphs: string[];
    bullets?: string[];
  }[];
  created_at: string;
};

export type CommerceTables = {
  branches: Table<Branch>;
  products: Table<Product>;
  product_categories: Table<ProductCategory>;
  product_subcategories: Table<ProductSubcategory>;
  product_variants: Table<
    ProductVariant,
    [{
      foreignKeyName: 'product_variants_product_id_fkey';
      columns: ['product_id'];
      isOneToOne: false;
      referencedRelation: 'products';
      referencedColumns: ['id'];
    }]
  >;
  branch_inventory: Table<BranchInventory>;
  ebike_units: Table<EbikeUnit>;
  inventory_movements: Table<InventoryMovement>;
  branch_transfers: Table<BranchTransfer>;
  branch_transfer_items: Table<BranchTransferItem>;
  branch_transfer_units: Table<BranchTransferUnit>;
  delivery_zones: Table<DeliveryZone>;
  orders: Table<Order>;
  order_items: Table<
    OrderItem,
    [{
      foreignKeyName: 'order_items_variant_id_fkey';
      columns: ['variant_id'];
      isOneToOne: false;
      referencedRelation: 'product_variants';
      referencedColumns: ['id'];
    }]
  >;
  order_payment_transactions: Table<OrderPaymentTransaction>;
  order_documents: Table<OrderDocument>;
  order_invoices: Table<OrderInvoice>;
  order_certificates: Table<OrderCertificate>;
  order_home_credit_details: Table<OrderHomeCreditDetails>;
  payment_recipients: Table<PaymentRecipient>;
  ownership_certificate_templates: Table<OwnershipCertificateTemplate>;
  business_settings: Table<BusinessSettings>;
  storefront_legal_policy_versions: Table<StorefrontLegalPolicyVersion>;
  service_appointments: Table<ServiceAppointment>;
  service_appointment_cancellation_requests: Table<ServiceAppointmentCancellationRequest>;
  service_appointment_internal_notes: Table<ServiceAppointmentInternalNote>;
  branch_service_hours: Table<BranchServiceHour>;
  service_appointment_closures: Table<ServiceAppointmentClosure>;
};
