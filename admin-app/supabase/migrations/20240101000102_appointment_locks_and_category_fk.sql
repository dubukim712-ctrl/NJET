begin;

create or replace function public.prevent_closure_over_scheduled_appointments()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if extract(minute from new.starts_at at time zone 'Asia/Manila')::integer not in (0, 30)
    or extract(second from new.starts_at at time zone 'Asia/Manila') <> 0
    or extract(minute from new.ends_at at time zone 'Asia/Manila')::integer not in (0, 30)
    or extract(second from new.ends_at at time zone 'Asia/Manila') <> 0 then
    raise exception 'Closure times must use 30-minute boundaries.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('service-branch:' || new.branch_id::text, 0)
  );
  if exists (
    select 1
    from public.service_appointments a
    where a.branch_id = new.branch_id
      and a.status in ('confirmed', 'in_service')
      and a.scheduled_at < new.ends_at
      and a.scheduled_at + interval '30 minutes' > new.starts_at
  ) then
    raise exception 'Reschedule confirmed appointments before blocking this time.';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_service_appointment_slot_overlap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if extract(minute from new.preferred_start_at at time zone 'Asia/Manila')::integer not in (0, 30)
      or extract(second from new.preferred_start_at at time zone 'Asia/Manila') <> 0 then
      raise exception 'Appointment requests must start on a 30-minute slot.';
    end if;
  end if;

  if new.status not in ('confirmed', 'in_service') or new.scheduled_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status
      and new.branch_id is not distinct from old.branch_id
      and new.scheduled_at is not distinct from old.scheduled_at
      and new.assigned_technician_id is not distinct from old.assigned_technician_id then
      return new;
    end if;
  end if;

  if extract(minute from new.scheduled_at at time zone 'Asia/Manila')::integer not in (0, 30)
    or extract(second from new.scheduled_at at time zone 'Asia/Manila') <> 0 then
    raise exception 'Scheduled appointments must start on a 30-minute slot.';
  end if;

  -- Take the same branch lock as closure creation before reading conflicts.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('service-branch:' || new.branch_id::text, 0)
  );
  if exists (
    select 1 from public.service_appointment_closures c
    where c.branch_id = new.branch_id
      and c.starts_at < new.scheduled_at + interval '30 minutes'
      and c.ends_at > new.scheduled_at
  ) then
    raise exception 'This time is blocked by a branch closure. Choose another time.';
  end if;

  if new.assigned_technician_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('service-technician:' || new.assigned_technician_id::text, 0)
    );
    if exists (
      select 1 from public.service_appointments a
      where a.id <> new.id
        and a.assigned_technician_id = new.assigned_technician_id
        and a.status in ('confirmed', 'in_service')
        and a.scheduled_at < new.scheduled_at + interval '30 minutes'
        and a.scheduled_at + interval '30 minutes' > new.scheduled_at
    ) then
      raise exception 'This technician already has an appointment in that 30-minute slot.';
    end if;
  end if;
  return new;
end;
$$;

-- Freeze category writes while reconciling existing rows and replacing the FK.
lock table public.product_subcategories, public.products in share row exclusive mode;

update public.products p
set category_id = s.category_id
from public.product_subcategories s
where s.id = p.subcategory_id and p.category_id is distinct from s.category_id;

alter table public.product_subcategories
  add constraint product_subcategories_category_id_id_key unique (category_id, id);

alter table public.products
  drop constraint products_subcategory_id_fkey,
  add constraint products_category_subcategory_fkey
    foreign key (category_id, subcategory_id)
    references public.product_subcategories (category_id, id)
    on update cascade
    on delete set null (subcategory_id);

notify pgrst, 'reload schema';

commit;
