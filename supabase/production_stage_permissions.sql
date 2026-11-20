-- Разрешаем менять этапы производства только сотрудникам с нужными ролями.
-- Эти политики уже применены в подключённом проекте Supabase.

create policy "Production staff can update production orders"
on public.production_orders
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.roles r on r.id_role = u.id_role
    where u.auth_user_id = (select auth.uid())
      and r.role_name in ('Руководитель', 'Менеджер', 'Мастер производства')
  )
)
with check (
  exists (
    select 1
    from public.users u
    join public.roles r on r.id_role = u.id_role
    where u.auth_user_id = (select auth.uid())
      and r.role_name in ('Руководитель', 'Менеджер', 'Мастер производства')
  )
);

-- При завершении последнего этапа обновляется статус самой заявки.
create policy "Production staff can complete orders"
on public.orders
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.roles r on r.id_role = u.id_role
    where u.auth_user_id = (select auth.uid())
      and r.role_name in ('Руководитель', 'Менеджер', 'Мастер производства')
  )
)
with check (
  exists (
    select 1
    from public.users u
    join public.roles r on r.id_role = u.id_role
    where u.auth_user_id = (select auth.uid())
      and r.role_name in ('Руководитель', 'Менеджер', 'Мастер производства')
  )
);
