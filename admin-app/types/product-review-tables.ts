type ProductReviewTable<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProductReviewStatus = 'pending' | 'published' | 'rejected';

export type ProductReview = {
  id: string;
  product_id: string;
  customer_id: string;
  order_item_id: string;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  status: ProductReviewStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductReviewTables = {
  product_reviews: ProductReviewTable<ProductReview>;
};
