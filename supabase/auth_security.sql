-- Безопасный доступ к профилям сотрудников.
-- Пользователь может читать только собственную запись; назначение роли
-- остаётся на стороне базы данных и серверного приложения.

drop policy if exists "Authenticated read users" on public.users;
drop policy if exists "Users can read own profile" on public.users;

create policy "Users can read own profile"
on public.users
for select
to authenticated
using ((select auth.uid()) = auth_user_id);

-- Обработчик вызывается триггером on_auth_user_created, а не через REST RPC.
revoke execute on function public.handle_new_auth_user()
from public, anon, authenticated;
