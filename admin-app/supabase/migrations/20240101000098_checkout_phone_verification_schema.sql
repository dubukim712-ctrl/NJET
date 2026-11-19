alter table public.users
  add column phone_number text check (
    phone_number is null or phone_number ~ '^\+639[0-9]{9}$'
  ),
  add column phone_verified_at timestamptz,
  add constraint users_phone_verification_check check (
    phone_verified_at is null or phone_number is not null
  );

alter table public.business_settings
  add column phone_verification_required boolean not null default true;

alter table public.orders
  add column phone_verification_status text not null default 'not_required'
    check (phone_verification_status in (
      'not_required', 'otp_verified', 'manual_pending', 'manual_verified'
    )),
  add column phone_verified_at timestamptz,
  add column phone_verified_by uuid references public.users(id) on delete set null,
  add constraint orders_phone_verification_metadata_check check (
    (
      phone_verification_status in ('not_required', 'manual_pending')
      and phone_verified_at is null
      and phone_verified_by is null
    )
    or (
      phone_verification_status = 'otp_verified'
      and phone_verified_at is not null
      and phone_verified_by is null
    )
    or (
      phone_verification_status = 'manual_verified'
      and phone_verified_at is not null
    )
  );

create table public.phone_verification_challenges (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  phone_number text not null check (phone_number ~ '^\+639[0-9]{9}$'),
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 5),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index phone_verification_challenges_user_created_idx
  on public.phone_verification_challenges (user_id, created_at desc);
create index phone_verification_challenges_phone_created_idx
  on public.phone_verification_challenges (phone_number, created_at desc);

alter table public.phone_verification_challenges enable row level security;
revoke all on public.phone_verification_challenges from public, anon, authenticated;
grant all on public.phone_verification_challenges to service_role;

notify pgrst, 'reload schema';
