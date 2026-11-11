-- Audit branch and delivery-zone configuration changes.
-- Orders already use the privacy-safe audit trigger from migration 22.
-- Run after 20240101000022_commerce_audit_logging.sql.

drop trigger if exists audit_branches_changes on public.branches;
create trigger audit_branches_changes
  after insert or update or delete on public.branches
  for each row execute procedure public.log_audit_event();

drop trigger if exists audit_delivery_zones_changes on public.delivery_zones;
create trigger audit_delivery_zones_changes
  after insert or update or delete on public.delivery_zones
  for each row execute procedure public.log_audit_event();

notify pgrst, 'reload schema';
