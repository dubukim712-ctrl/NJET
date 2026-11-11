alter table public.product_variants
  add column if not exists specifications jsonb;

alter table public.product_variants
  drop constraint if exists product_variants_specifications_object_check;
alter table public.product_variants
  add constraint product_variants_specifications_object_check
  check (specifications is null or jsonb_typeof(specifications) = 'object');

notify pgrst, 'reload schema';
