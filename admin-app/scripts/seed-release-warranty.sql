begin;

insert into public.branches (slug, name, address)
values ('release-east', 'Release East', 'East test workshop')
returning id as east_id \gset
insert into public.branches (slug, name, address)
values ('release-west', 'Release West', 'West test workshop')
returning id as west_id \gset

update public.users set role_id = (select id from public.roles where slug = 'sales'), branch_id = :'east_id'
where id = :'staff_id';
update public.users set role_id = (select id from public.roles where slug = 'sales'), branch_id = :'west_id'
where id = :'wrong_staff_id';
update public.users set role_id = (select id from public.roles where scope = 'staff' and is_full_access order by slug limit 1)
where id = :'admin_id';

insert into public.products (slug, name, product_type, category_id)
values ('release-bike', 'Release Bike', 'ebike',
  (select id from public.product_categories where tracks_serial_inventory order by id limit 1))
returning id as product_id \gset
insert into public.product_variants (product_id, sku, name, price_minor)
values (:'product_id', 'CI-WARRANTY', 'Red', 100000)
returning id as variant_id \gset
update public.business_settings set phone_verification_required = false where id = 1;
insert into public.orders (customer_id, customer_name, contact_number, fulfillment, branch_id, branch_name,
  payment_method, status, total_minor, balance_due_minor, terms_version, privacy_version, terms_accepted_at,
  privacy_accepted_at, completed_at)
values (:'user_id', 'Release Customer', '09123456789', 'pickup', :'east_id', 'Release East',
  'cash', 'completed', 100000, 100000, 'CI-TERMS', 'CI-PRIVACY', now(), now(), now())
returning id as order_id \gset
insert into public.inventory_receipts (branch_id, supplier_name, received_at)
values (:'east_id', 'CI Supplier', now()) returning id as receipt_id \gset
insert into public.inventory_receipt_items (receipt_id, variant_id, quantity_received, supplier_unit_cost_minor)
values (:'receipt_id', :'variant_id', 2, 50000) returning id as receipt_item_id \gset
select set_config('njet.receipt_cost_update', 'on', true);
insert into public.ebike_units (branch_id, variant_id, serial_number, motor_number, status, unit_cost_minor, receipt_item_id)
values (:'east_id', :'variant_id', 'CI-ORIGINAL', 'CI-MOTOR-OLD', 'in_stock', 50000, :'receipt_item_id')
returning id as original_id \gset
insert into public.ebike_units (branch_id, variant_id, serial_number, motor_number, status, unit_cost_minor, receipt_item_id)
values (:'east_id', :'variant_id', 'CI-REPLACEMENT', 'CI-MOTOR-NEW', 'in_stock', 50000, :'receipt_item_id');
insert into public.order_items (order_id, variant_id, product_name, product_type, variant_name, sku, quantity, unit_price_minor)
values (:'order_id', :'variant_id', 'Release Bike', 'ebike', 'Red', 'CI-WARRANTY', 1, 100000)
returning id as item_id \gset
update public.ebike_units set status = 'sold', order_item_id = :'item_id' where id = :'original_id';
insert into public.branch_inventory (branch_id, variant_id, stock) values (:'east_id', :'variant_id', 1);

insert into public.service_appointments (id, appointment_number, customer_id, customer_name, contact_number,
  branch_id, branch_name, service_mode, service_type, bike_make, bike_model, bike_serial_number, issue_description,
  preferred_start_at, status, created_by)
values (:'appointment_id', 'SVC-CI-RELEASE', :'user_id', 'Release Customer', '09123456789',
  :'east_id', 'Release East', 'branch_visit', 'repair', 'NJET', 'Release Bike', 'CI-ORIGINAL', 'Release warranty fixture',
  date_trunc('hour', now()), 'requested', :'user_id');
insert into public.service_warranty_cases (appointment_id, unit_id, original_order_id, original_serial, decision,
  decision_note, decided_by, decided_at)
values (:'appointment_id', :'original_id', :'order_id', 'CI-ORIGINAL', 'replacement_approved',
  'Approved in the isolated fixture.', :'admin_id', now());

commit;
