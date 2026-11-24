export type DatabaseProductReviewFunctions = {
  published_product_rating_summary: {
    Args: { p_product_id: string };
    Returns: { average_rating: number; review_count: number }[];
  };
  published_product_rating_summaries: {
    Args: { p_product_ids: string[] };
    Returns: {
      product_id: string;
      average_rating: number;
      review_count: number;
    }[];
  };
  published_product_reviews: {
    Args: { p_product_id: string; p_limit: number; p_offset: number };
    Returns: {
      review_id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      reviewer_name: string | null;
      is_anonymous: boolean;
      reviewer_avatar_url: string | null;
      variant_name: string | null;
    }[];
  };
  customer_order_item_review_details: {
    Args: { p_order_id: string; p_order_item_id: string };
    Returns: {
      eligible: boolean;
      product_id: string | null;
      review_id: string | null;
      rating: number | null;
      comment: string | null;
      status: string | null;
      is_anonymous: boolean | null;
    }[];
  };
  customer_order_item_reviews: {
    Args: { p_order_id: string; p_order_item_ids: string[] };
    Returns: {
      order_item_id: string;
      product_id: string | null;
      eligible: boolean;
      review_id: string | null;
      rating: number | null;
      comment: string | null;
      status: string | null;
      is_anonymous: boolean | null;
    }[];
  };
  customer_product_review_items: {
    Args: { p_product_id: string };
    Returns: {
      order_item_id: string;
      order_id: string;
      order_number: string;
      variant_name: string;
      review_id: string | null;
      rating: number | null;
      comment: string | null;
      status: string | null;
      is_anonymous: boolean | null;
    }[];
  };
  submit_product_review: {
    Args: {
      p_order_id: string;
      p_order_item_id: string;
      p_product_id: string;
      p_rating: number;
      p_comment: string | null;
      p_is_anonymous: boolean;
    };
    Returns: string;
  };
  admin_product_reviews: {
    Args: { p_limit: number; p_offset: number };
    Returns: {
      review_id: string;
      product_id: string;
      product_name: string;
      rating: number;
      comment: string | null;
      created_at: string;
    }[];
  };
  moderate_product_review: {
    Args: { p_review_id: string; p_status: 'published' | 'rejected' };
    Returns: undefined;
  };
};
