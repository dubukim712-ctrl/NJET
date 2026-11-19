grant select (
  regular_unit_price_minor,
  discount_unit_minor,
  discount_name_snapshot
) on public.order_items to authenticated;

notify pgrst, 'reload schema';
