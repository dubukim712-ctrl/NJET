create or replace function public.initialize_order_item_discount_amount()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.regular_unit_price_minor := new.unit_price_minor;
  new.discount_unit_minor := 0;
  return new;
end;
$$;

revoke all on function public.initialize_order_item_discount_amount()
  from public, anon, authenticated;

create trigger order_items_initialize_discount_amount
  before insert on public.order_items
  for each row execute function public.initialize_order_item_discount_amount();
