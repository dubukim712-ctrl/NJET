begin;

create index orders_customer_created_id_idx
  on public.orders (customer_id, created_at desc, id desc);
drop index public.orders_customer_created_idx;

create index order_items_variant_id_idx
  on public.order_items (variant_id);

create index checkout_submissions_order_id_idx
  on public.checkout_submissions (order_id);

commit;
