export type CustomerRelease = {
  id: string;
  order_id: string | null;
  image_path: string;
  image_url: string;
  customer_name: string | null;
  product_id: string | null;
  model_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  caption: string | null;
  is_approved: boolean;
  uploaded_by: string | null;
  display_order: number;
  created_at: string;
};

type Metadata = Pick<CustomerRelease, 'order_id' | 'customer_name' | 'product_id' | 'model_name'
  | 'branch_id' | 'branch_name' | 'caption' | 'is_approved' | 'display_order'>;

export type CustomerReleaseTables = {
  customer_releases: {
    Row: CustomerRelease;
    Insert: Partial<Metadata> & { image_path: string; uploaded_by?: string | null };
    Update: Partial<Metadata>;
    Relationships: [];
  };
};
