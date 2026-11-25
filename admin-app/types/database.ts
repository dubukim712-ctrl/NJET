import type { AppointmentEmailDetails, AppointmentEmailEvent } from '../data/email/appointment-status-email-content';
import type { OrderEmailDetails, OrderEmailStatus } from '../data/email/order-status-email-content';
import type {
  Permission,
  PermissionSurface,
  Role,
  RolePermission,
  RoleScope,
  UserProfile,
} from './rbac';
import type { CommerceTables } from './commerce-tables';
import type { AdminNotificationTables } from './admin-notifications';
import type { ReceiptTables } from './receipt-tables';
import type { SupportChatTables } from './support-chat-tables';
import type { ProductDiscountTables } from './product-discount-tables';
import type { ProductReviewTables } from './product-review-tables';
import type { CrmTables } from './crm';
import type { DatabaseFunctions } from './database-functions';

export type {
  Permission,
  PermissionSurface,
  Role,
  RolePermission,
  RoleScope,
  UserProfile,
} from './rbac';
export type { AdminNotification, NotificationEventType } from './admin-notifications';
export type { ProductReview, ProductReviewStatus } from './product-review-tables';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          table_name: string;
          record_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          table_name: string;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          table_name?: string;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: Permission;
        Insert: {
          key: string;
          name: string;
          description?: string | null;
          group_name: string;
          surface: PermissionSurface;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          key?: string;
          name?: string;
          description?: string | null;
          group_name?: string;
          surface?: PermissionSurface;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: RolePermission;
        Insert: {
          id?: string;
          role_id: string;
          permission_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          permission_key?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'role_permissions_permission_key_fkey';
            columns: ['permission_key'];
            isOneToOne: false;
            referencedRelation: 'permissions';
            referencedColumns: ['key'];
          },
        ];
      };
      roles: {
        Row: Role;
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          scope?: RoleScope;
          is_full_access?: boolean;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          scope?: RoleScope;
          is_full_access?: boolean;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone_number: string | null;
          phone_verified_at: string | null;
          welcome_email_sent_at: string | null;
          street_address: string | null;
          province_code: string | null;
          province_name: string | null;
          city_code: string | null;
          city_name: string | null;
          barangay_code: string | null;
          barangay_name: string | null;
          postal_code: string | null;
          role_id: string;
          branch_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone_number?: string | null;
          phone_verified_at?: string | null;
          welcome_email_sent_at?: string | null;
          street_address?: string | null;
          province_code?: string | null;
          province_name?: string | null;
          city_code?: string | null;
          city_name?: string | null;
          barangay_code?: string | null;
          barangay_name?: string | null;
          postal_code?: string | null;
          role_id: string;
          branch_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone_number?: string | null;
          phone_verified_at?: string | null;
          welcome_email_sent_at?: string | null;
          street_address?: string | null;
          province_code?: string | null;
          province_name?: string | null;
          city_code?: string | null;
          city_name?: string | null;
          barangay_code?: string | null;
          barangay_name?: string | null;
          postal_code?: string | null;
          role_id?: string;
          branch_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'users_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
        ];
      };
    } & CommerceTables & AdminNotificationTables & ReceiptTables & SupportChatTables
      & ProductDiscountTables & ProductReviewTables & CrmTables;
    Views: {
      user_profiles: {
        Row: UserProfile;
        Relationships: [
          {
            foreignKeyName: 'users_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'users_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: DatabaseFunctions & {
      appointment_status_email_details: {
        Args: { p_id: string; p_event: AppointmentEmailEvent; p_scheduled_at: string | null };
        Returns: AppointmentEmailDetails[];
      };
      order_status_email_details: {
        Args: { p_order_id: string; p_status: OrderEmailStatus };
        Returns: OrderEmailDetails[];
      };
      claim_customer_welcome_email: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
