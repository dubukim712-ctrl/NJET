export type DatabaseCoreFunctions = {
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
