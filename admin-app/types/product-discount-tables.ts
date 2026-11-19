type DiscountTable<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProductDiscountTables = {
  product_discounts: DiscountTable<{
    id: string;
    name: string;
    discount_type: 'percentage' | 'fixed';
    value: number;
    coupon_code: string | null;
    active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    max_redemptions: number | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
  }>;
  product_discount_targets: DiscountTable<{
    id: string;
    discount_id: string;
    product_variant_id: string | null;
    product_category_id: string | null;
    created_at: string;
  }>;
  product_discount_redemptions: DiscountTable<{
    id: string;
    discount_id: string;
    order_id: string;
    customer_id: string | null;
    normalized_phone: string | null;
    status: 'reserved' | 'redeemed' | 'released';
    created_at: string;
    released_at: string | null;
  }>;
};

export type ProductDiscount = ProductDiscountTables['product_discounts']['Row'];
