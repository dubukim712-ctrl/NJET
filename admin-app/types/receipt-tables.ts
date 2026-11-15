type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type SalesReceiptTemplate = {
  id: number;
  object_path: string;
  template_version: string;
  created_at: string;
  updated_at: string;
};

export type OrderReceipt = {
  id: string;
  order_id: string;
  object_path: string;
  content_type: string;
  file_size: number;
  generated_by: string | null;
  template_version: string;
  generated_at: string;
};

export type ReceiptTables = {
  sales_receipt_templates: Table<SalesReceiptTemplate>;
  order_receipts: Table<OrderReceipt>;
};
