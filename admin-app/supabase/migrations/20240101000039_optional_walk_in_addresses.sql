-- Keep delivery and online Home Credit addresses required, but make walk-in
-- address details optional for every payment method.

do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'public.orders'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%address_line1%'
    and pg_get_constraintdef(oid) like '%payment_method = ''home_credit''%'
    and pg_get_constraintdef(oid) like '%fulfillment%'
  limit 1;

  if v_constraint is null
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.orders'::regclass
        and conname = 'orders_address_requirements_check'
    ) then
    raise exception 'Could not safely update the order address requirement.';
  end if;
  if v_constraint is not null then
    execute format('alter table public.orders drop constraint %I', v_constraint);
  end if;
  alter table public.orders
    drop constraint if exists orders_address_requirements_check;
  alter table public.orders
    add constraint orders_address_requirements_check
    check (
      (
        fulfillment = 'delivery'
        and nullif(trim(address_line1), '') is not null
        and nullif(trim(barangay), '') is not null
        and nullif(trim(city), '') is not null
        and nullif(trim(province), '') is not null
      )
      or (
        fulfillment = 'pickup'
        and order_source = 'online'
        and payment_method = 'home_credit'
        and nullif(trim(address_line1), '') is not null
        and nullif(trim(barangay), '') is not null
        and nullif(trim(city), '') is not null
        and nullif(trim(province), '') is not null
      )
      or (
        fulfillment = 'pickup'
        and order_source = 'walk_in'
      )
      or (
        fulfillment = 'pickup'
        and order_source = 'online'
        and payment_method <> 'home_credit'
        and (
          (
            address_line1 is null
            and barangay is null
            and city is null
            and province is null
            and postal_code is null
          )
          or (
            nullif(trim(address_line1), '') is not null
            and nullif(trim(barangay), '') is not null
            and nullif(trim(city), '') is not null
            and nullif(trim(province), '') is not null
          )
        )
      )
    );
end;
$$;

do $$
declare
  v_function text;
  v_old text := $old$if p_payment_method = 'home_credit' then
    if nullif(btrim(p_address_line1), '') is null
      or nullif(btrim(p_barangay), '') is null
      or nullif(btrim(p_city), '') is null
      or nullif(btrim(p_province), '') is null then
      raise exception 'Complete the address fields for Home Credit.';
    end if;
  elsif nullif(btrim(p_address_line1), '') is not null
    or nullif(btrim(p_barangay), '') is not null
    or nullif(btrim(p_city), '') is not null
    or nullif(btrim(p_province), '') is not null
    or nullif(btrim(p_postal_code), '') is not null then
    raise exception 'Address details are only used for Home Credit.';
  end if;$old$;
begin
  v_function := pg_get_functiondef(
    'public.create_walk_in_sale(text,text,uuid,text,text,text,integer,text,text,text,text,text,jsonb)'::regprocedure
  );
  if position(v_old in v_function) > 0 then
    v_function := replace(v_function, v_old, '');
  elsif position('Complete the address fields for Home Credit.' in v_function) > 0
    or position('Address details are only used for Home Credit.' in v_function) > 0 then
    raise exception 'Could not safely make walk-in address details optional.';
  end if;
  execute v_function;
end;
$$;

notify pgrst, 'reload schema';
