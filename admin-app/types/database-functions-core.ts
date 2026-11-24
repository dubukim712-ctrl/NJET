export type DatabaseCoreFunctions = {
  customer_recent_service_bikes: {
    Args: Record<PropertyKey, never>;
    Returns: { make: string; model: string; serial: string | null }[];
  };
  save_first_checkout_address: {
    Args: Omit<DatabaseCoreFunctions['save_customer_profile_contact']['Args'], 'p_phone_number'>;
    Returns: boolean;
  };
  save_customer_profile: {
    Args: DatabaseCoreFunctions['save_customer_profile_contact']['Args'] & {
      p_full_name: string | null;
      p_avatar_url: string | null;
    };
    Returns: boolean;
  };
  save_customer_profile_contact: {
    Args: {
      p_phone_number: string | null;
      p_street_address: string | null;
      p_province_code: string | null;
      p_province_name: string | null;
      p_city_code: string | null;
      p_city_name: string | null;
      p_barangay_code: string | null;
      p_barangay_name: string | null;
      p_postal_code: string | null;
    };
    Returns: boolean;
  };
  current_user_has_permission: {
    Args: { p_key: string };
    Returns: boolean;
  };
  current_user_is_branch_scoped: {
    Args: Record<PropertyKey, never>;
    Returns: boolean;
  };
  current_user_branch_id: {
    Args: Record<PropertyKey, never>;
    Returns: string | null;
  };
  current_user_can_access_branch: {
    Args: { p_branch_id: string | null };
    Returns: boolean;
  };
  current_user_is_full_access: {
    Args: Record<PropertyKey, never>;
    Returns: boolean;
  };
  current_user_permissions: {
    Args: Record<PropertyKey, never>;
    Returns: string[];
  };
  role_permission_keys: {
    Args: { p_role_id: string };
    Returns: string[];
  };
  current_user_role: {
    Args: Record<PropertyKey, never>;
    Returns: string;
  };
  current_user_is_admin: {
    Args: Record<PropertyKey, never>;
    Returns: boolean;
  };
  current_user_is_super_admin: {
    Args: Record<PropertyKey, never>;
    Returns: boolean;
  };
  handle_new_user: {
    Args: Record<PropertyKey, never>;
    Returns: undefined;
  };
  handle_updated_at: {
    Args: Record<PropertyKey, never>;
    Returns: undefined;
  };
  log_audit_event: {
    Args: Record<PropertyKey, never>;
    Returns: undefined;
  };
};
