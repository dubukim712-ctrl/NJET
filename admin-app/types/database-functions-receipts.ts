export type DatabaseReceiptFunctions = {
  save_order_receipt: {
    Args: {
      p_order_id: string;
      p_object_path: string;
      p_file_size: number;
      p_template_version: string;
    };
    Returns: undefined;
  };
};
