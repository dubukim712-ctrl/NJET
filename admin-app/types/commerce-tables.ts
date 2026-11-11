export type ProductType = 'ebike' | 'part' | 'accessory';
export type Fulfillment = 'pickup' | 'delivery';
export type PaymentMethod = 'cash' | 'online' | 'home_credit';
export type PaymentProvider = 'gcash' | 'bank_transfer' | 'card';
export type OrderStatus =
  | 'awaiting_payment'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'expired'
  | 'completed';

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
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

type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  specifications: Record<string, string> | null;
  price_minor: number;
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
  status: 'needs_identification' | 'in_stock' | 'in_transit' | 'sold';
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
    | 'transfer_dispatched' | 'transfer_received';
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

type Order = {
  id: string;
  order_number: string;
  customer_id: string | null;
  order_source: 'online' | 'walk_in';
  cash_tendered_minor: number | null;
  customer_name: string;
  contact_number: string;
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
  delivery_fee_minor: number;
  reservation_due_minor: number;
  balance_due_minor: number;
  online_due_minor: number;
  home_credit_downpayment_due_minor: number;
  terms_version: string | null;
  privacy_version: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  variant_id: string;
  product_name: string;
  product_type: ProductType;
  variant_name: string;
  sku: string;
  quantity: number;
  unit_price_minor: number;
  reservation_unit_minor: number;
  created_at: string;
};

type OrderDocument = {
  id: string;
  order_id: string;
  kind: 'payment_proof' | 'identity';
  object_path: string;
  content_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
};

type OrderInvoice = {
  id: string;
  order_id: string;
  invoice_no: string;
  created_at: string;
  updated_at: string;
};

type OrderCertificate = {
  id: string;
  order_id: string;
  object_path: string;
  content_type: string;
  file_size: number;
  generated_by: string | null;
  template_version: string;
  generated_at: string;
};

type OrderHomeCreditDetails = {
  order_id: string;
  home_credit_acc_no: string;
  downpayment_minor: number;
  terms_months: number;
  monthly_payment_minor: number;
  recorded_by: string | null;
  created_at: string;
};

type PaymentRecipient = {
  id: string;
  provider: PaymentProvider;
  recipient_name: string;
  account_details: string;
  payment_qr_path: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type OwnershipCertificateTemplate = {
  id: number;
  object_path: string;
  template_version: string;
  created_at: string;
  updated_at: string;
};

type BusinessSettings = {
  id: number;
  business_name: string;
  phone: string;
  email: string;
  address: string;
  logo_path: string | null;
  business_hours: string;
  created_at: string;
  updated_at: string;
};

export type CommerceTables = {
  branches: Table<Branch>;
  products: Table<Product>;
  product_categories: Table<ProductCategory>;
  product_subcategories: Table<ProductSubcategory>;
  product_variants: Table<ProductVariant>;
  branch_inventory: Table<BranchInventory>;
  ebike_units: Table<EbikeUnit>;
  inventory_movements: Table<InventoryMovement>;
  branch_transfers: Table<BranchTransfer>;
  branch_transfer_items: Table<BranchTransferItem>;
  branch_transfer_units: Table<BranchTransferUnit>;
  delivery_zones: Table<DeliveryZone>;
  orders: Table<Order>;
  order_items: Table<OrderItem>;
  order_documents: Table<OrderDocument>;
  order_invoices: Table<OrderInvoice>;
  order_certificates: Table<OrderCertificate>;
  order_home_credit_details: Table<OrderHomeCreditDetails>;
  payment_recipients: Table<PaymentRecipient>;
  ownership_certificate_templates: Table<OwnershipCertificateTemplate>;
  business_settings: Table<BusinessSettings>;
};
