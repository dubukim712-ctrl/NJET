export type CrmCustomer = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  phone_verified_at: string | null;
  address: string | null;
  recent_branch_name: string | null;
  last_interaction_at: string | null;
  open_follow_ups: number;
};

export type CrmBike = { name: string; variant: string; serial: string | null };
export type CrmActivity = {
  id: string;
  kind: 'Order' | 'Service' | 'Chat';
  reference: string;
  detail: string | null;
  status: string;
  occurred_at: string;
  bikes: CrmBike[] | null;
};

export type CrmNote = { id: string; body: string; created_at: string; author: string; branch_name: string };
export type CrmStatus = 'open' | 'completed';
export type CrmDueFilter = 'any' | 'overdue' | 'today' | 'upcoming';
export type CrmFollowUp = {
  id: string;
  customer_id: string;
  customer_name: string;
  next_action: string;
  due_on: string;
  status: CrmStatus;
  assignee_name: string;
  branch_name: string;
};
export type CrmStaffOption = { id: string; name: string; branch_id: string; branch_name: string };

export type CrmFunctions = {
  crm_customers: {
    Args: { p_customer_id: string | null; p_search: string; p_offset: number };
    Returns: CrmCustomer[];
  };
  crm_customer_activity: { Args: { p_customer_id: string }; Returns: CrmActivity[] };
  crm_notes: { Args: { p_customer_id: string }; Returns: CrmNote[] };
  crm_follow_up_queue: {
    Args: { p_customer_id: string | null; p_status: CrmStatus };
    Returns: CrmFollowUp[];
  };
  crm_follow_up_page: {
    Args: { p_status: CrmStatus; p_mine: boolean; p_due: CrmDueFilter; p_search: string; p_offset: number };
    Returns: CrmFollowUp[];
  };
  crm_staff_options: { Args: Record<PropertyKey, never>; Returns: CrmStaffOption[] };
};

type Entry = { id: string; customer_id: string; branch_id: string; created_by: string | null; created_at: string };
type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type CrmTables = {
  crm_customer_notes: Table<Entry & { body: string },
    { customer_id: string; branch_id: string; body: string }, never>;
  crm_follow_ups: Table<Entry & {
    assignee_id: string | null; due_on: string; status: CrmStatus; next_action: string;
  }, {
    customer_id: string; branch_id: string; assignee_id: string; due_on: string; next_action: string;
  }, { status: CrmStatus }>;
};
