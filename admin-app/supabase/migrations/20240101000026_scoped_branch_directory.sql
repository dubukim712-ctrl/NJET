-- Limit branch records while providing minimal labels for permitted transfers.
-- Run after 20240101000025_branch_scope_write_guards.sql.

drop policy if exists "Storefront and staff can view branches" on public.branches;
create policy "Storefront and staff can view branches"
  on public.branches for select to authenticated
  using (
    (
      (public.current_user_has_permission('branches.read')
        or public.current_user_has_permission('branches.manage'))
      and public.current_user_can_access_branch(id)
    )
    or (
      active
      and public.current_user_has_permission('storefront.access')
      and public.current_user_can_access_branch(id)
    )
  );

create or replace function public.transfer_branch_options()
returns table(id uuid, name text, active boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (
    public.current_user_has_permission('products.read')
    or public.current_user_has_permission('products.manage')
  ) then
    raise exception 'You do not have permission to view transfer branches.';
  end if;
  return query
  select b.id, b.name, b.active
  from public.branches b
  order by b.name
  limit 200;
end;
$$;
revoke all on function public.transfer_branch_options() from public, anon;
grant execute on function public.transfer_branch_options() to authenticated;

notify pgrst, 'reload schema';
