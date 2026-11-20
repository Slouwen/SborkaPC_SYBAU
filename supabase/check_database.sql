-- Проверка существующих таблиц SborkaPC. Только SELECT, ничего не изменяет.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

select 'roles' as table_name, count(*) as rows_count from public.roles
union all select 'users', count(*) from public.users
union all select 'agents', count(*) from public.agents
union all select 'components', count(*) from public.components
union all select 'orders', count(*) from public.orders
union all select 'order_items', count(*) from public.order_items
union all select 'production_orders', count(*) from public.production_orders
union all select 'warehouse', count(*) from public.warehouse
order by table_name;
