-- Clearly labeled demo data. Run after commerce staff actions; replace before launch.

insert into public.branches (id, slug, name, address, is_demo)
values
  ('00000000-0000-4000-8000-000000000001', 'demo-main-branch', 'Demo Main Branch', 'Sample branch address - replace before launch', true),
  ('00000000-0000-4000-8000-000000000002', 'demo-second-branch', 'Demo Second Branch', 'Sample branch address - replace before launch', true)
on conflict (id) do nothing;

insert into public.products (id, slug, name, description, product_type, is_demo)
values
  ('00000000-0000-4000-8000-000000000101', 'demo-city-ebike', 'Demo City E-bike', 'Sample e-bike listing. Replace with an actual NJET product.', 'ebike', true),
  ('00000000-0000-4000-8000-000000000102', 'demo-brake-pad-set', 'Demo Brake Pad Set', 'Sample spare part listing for catalog testing.', 'part', true),
  ('00000000-0000-4000-8000-000000000103', 'demo-rider-helmet', 'Demo Rider Helmet', 'Sample accessory listing for catalog testing.', 'accessory', true)
on conflict (id) do nothing;

insert into public.product_variants (
  id, product_id, sku, name, price_minor, reservation_minor, is_demo
)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'DEMO-EBIKE-01', 'Standard / Graphite', 49990000, 4999000, true),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000102', 'DEMO-PART-01', 'Front brake pad set', 85000, 0, true),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000103', 'DEMO-ACCESSORY-01', 'Adult / Matte Black', 195000, 0, true)
on conflict (id) do nothing;

insert into public.branch_inventory (branch_id, variant_id, stock)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 4),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000201', 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000202', 12),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000202', 7),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000203', 6),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000203', 3)
on conflict (branch_id, variant_id) do nothing;

insert into public.delivery_zones (id, name, fee_minor, is_demo)
values ('00000000-0000-4000-8000-000000000301', 'Demo Local Zone', 250000, true)
on conflict (id) do nothing;
