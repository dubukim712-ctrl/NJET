# Admin App

Secured authentication and dashboard built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and Supabase.

## Setup

1. Copy the environment template and fill in your Supabase values:

   ```bash
   cp .env.example .env.local
   ```

   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are both supported.

2. Apply the database migrations in `supabase/migrations/` in order (oldest first).
   Either paste each file into the Supabase SQL editor, or use the Supabase CLI:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   Apply all nineteen migrations in filename order. Migrations `0004`–`0006` replace
   the legacy capability-based roles with granular permissions; `0007` adds
   controlled audit-log clearing and `0008` disables audit entries for that action.
   Migrations `0009`–`0012` add the commerce schema, access policies, checkout
   and staff order RPCs; `0013` inserts clearly labeled sample commerce data.
   Migrations `0014`–`0018` add product images and subcategories, serial-tracked
   e-bike units, inventory movements, branch transfers, and serial-aware orders.
   Migration `0019` adds optional map coordinates for branches.
   They create:

   - `public.roles` — system and custom roles with immutable slugs, a surface
     (`staff` or `customer`), and an optional full-access flag.
   - `public.users` — profiles linked to `auth.users` and to `public.roles` via `role_id`.
   - `public.permissions` and `public.role_permissions` — the permission catalog
     and each role's grants.
   - `public.user_profiles` — profiles with their role surface, full-access flag,
     and effective permissions.
   - `public.audit_logs` — records of user, role, and role-permission changes,
     including before/after snapshots.
   - Security-definer RPCs and database guards for role changes, assignment, and
     the last full-access admin.
   - Product variants, branch inventory, delivery zones, orders, and private
     order-document storage for the storefront prototype.

Commerce routes are `/shop`, `/shop/view-product/[slug]`, and `/checkout`.
Staff configuration and order review are under `/admin/products`,
`/admin/branches`, `/admin/delivery-zones`, and `/admin/orders`. Stock is not
held until staff confirms an order. Online payment is a manual proof-of-payment
flow, Home Credit applications are completed in-store, and the terms/privacy
copy remains a legal-review placeholder. Replace all `is_demo` sample records
and policy placeholders before using the flow with real customers.

Product types are the fixed main categories; staff create subcategories under
each type from `/admin/products`. Product images are public storefront images;
variant images override the general product image. E-bike inventory is sold and
transferred by serial/motor-numbered unit. Existing e-bike quantities are
preserved as units needing identification and are not available for sale until
staff enters both numbers. Parts and accessories remain quantity-based.
Transfers reduce source stock at dispatch and add it to destination stock at
receipt. Inventory movements are visible under `/admin/products`.

3. In the Supabase dashboard, set **Authentication → URL Configuration**:

   - Site URL: `http://localhost:3000`
   - Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/confirm`

4. Create an account, then promote the first admin in the SQL editor:

   ```sql
   update public.users
   set role_id = (select id from public.roles where slug = 'admin')
   where email = 'you@example.com';
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

## Route groups

Routes are organized with App Router groups, which do not affect URLs:

| Group | Folder | Contains |
| --- | --- | --- |
| Global | `app/(global)` | Home page, login, register, forgot/reset password, auth callbacks |
| Customer | `app/(customer)` | Authenticated dashboard and its group-level guard/shell |
| Admin | `app/(admin)` | Admin panel and its group-level guard/shell |

## Routes

| Route | Access |
| --- | --- |
| `/` | Public |
| `/login`, `/register`, `/forgot-password` | Public (redirects signed-in users) |
| `/reset-password` | Requires a recovery session |
| `/dashboard/*` | Storefront permission; customer role by default |
| `/admin/*` | Admin-panel permission; staff roles only |
| `/no-access` | Signed-in users without access to their assigned surface |

## Roles and users

The system roles are `admin`, `sales`, `technician`, and `customer`. New
sign-ups receive `customer`. The `admin` role is the only full-access role and
can use both the admin panel and storefront. Sales and technician roles are
staff-only; the customer role is storefront-only.

The initial permission catalog is `admin.access`, `users.read`, `users.manage`,
`roles.read`, `roles.manage`, `audit_logs.read`, and `storefront.access`.
`manage` grants also imply `read`. Default grants:

| Role | Default permissions |
| --- | --- |
| Admin | Full access to every permission |
| Sales | `admin.access`, `users.read` |
| Technician | `admin.access` |
| Customer | `storefront.access` |

Admins can preview the storefront at `/dashboard`. Customer roles cannot enter
the admin panel; staff roles cannot enter the storefront unless explicitly
granted access. Future storefront features can add their own permissions.

Roles are data, not code. Users with `roles.read` can view roles; users with
`roles.manage` can manage roles. This permission is granted only to the
full-access admin by default. A role manager can grant only permissions they
already hold, preventing delegated role management from escalating privileges.
System roles cannot be renamed or deleted, but their permissions are editable.
Custom role slugs are immutable, and a custom role can only be deleted when no
users are assigned to it.

Users with `users.read` can view accounts; `users.manage` allows role
assignment. Nobody can change their own role, and role assignments cannot
cross staff/storefront surfaces. Only a full-access admin can assign or remove
full access. The database prevents removing the last full-access admin.
Assignments go through the `assign_user_role()` security-definer RPC, so
clients never update `role_id` directly. To bootstrap the first admin after
signing up:

```sql
update public.users
set role_id = (select id from public.roles where slug = 'admin')
where email = 'you@example.com';
```

## Audit logs

User, role, and role-permission changes are written to `public.audit_logs` by
the `log_audit_event()` trigger. Each entry stores:

- `actor_id` and `actor_email` — who made the change (`System` when no user is signed in)
- `action` — `insert`, `update`, or `delete`
- `table_name` and `record_id` — what changed
- `old_data` and `new_data` — full JSON snapshots before and after the write
- `created_at` — when it happened

Users with `audit_logs.read` can review the log at `/admin/audit-logs`, filter
by action or entity, and open an entry to see the field-level diff and raw
snapshots. Full-access admins can delete selected entries or clear all entries.
Clear and delete actions are not themselves recorded; direct client table writes
remain disabled. Migration `0008` updates the clearing RPC to enforce a `WHERE`
clause while allowing a full clear.

To audit another table, attach the same trigger (the table needs an `id` column,
and its rows must be safe to store in the log):

```sql
create trigger audit_my_table_changes
  after insert or update or delete on public.my_table
  for each row execute procedure public.log_audit_event();
```

## Security model

- Sessions are stored in HttpOnly cookies by `@supabase/ssr`; nothing auth-related is written to `localStorage`.
- `proxy.ts` refreshes the session and blocks unauthenticated access to protected paths.
- Server layouts re-check the user (`supabase.auth.getUser()`) so guards hold even without the proxy.
- Server layouts, actions, and database policies independently enforce the required permissions.
- Row Level Security is enabled on users, roles, permissions, and role-permission data. Users can read/update their own profile; `users.read` and `users.manage` govern broader account access.
- Column-level grants let users edit only `full_name` and `avatar_url`; `role_id` changes go through `assign_user_role()`.
- Role creation, permission changes, and assignment use security-definer RPCs with permission and escalation checks.
- Database triggers prevent removing the last full-access admin, renaming or deleting system roles, and granting permissions outside a role's surface.
- `user_profiles` uses `security_invoker = true`, so the view respects the caller's RLS.
- `public.audit_logs` is readable only by users with `audit_logs.read`; clients have no direct insert, update, or delete grants. Full-access admins use the `clear_audit_logs()` RPC; clear/delete operations are not recorded.
- All form input is validated with Zod before reaching Supabase.
