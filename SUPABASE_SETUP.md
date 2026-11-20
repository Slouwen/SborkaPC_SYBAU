# Подключение приложения SborkaPC к существующей базе Supabase

Проект Supabase: https://supabase.com/dashboard/project/armsafizuyzgokahqscd
Project URL: `https://armsafizuyzgokahqscd.supabase.co`

## Существующая база

В проекте уже обнаружены 8 таблиц с данными: `roles`, `users`, `agents`, `components`, `orders`, `order_items`, `production_orders`, `warehouse`. Таблицу `DiscountRules` не добавляем. Не запускайте старый `schema.sql` из предыдущей версии архива: названия столбцов в вашей реальной базе другие.

Приложение адаптировано под текущие поля: `id_role`, `role_name`, `id_agent`, `agent_name`, `discount_percent`, `id_component`, `component_name`, `quantity`, `id_order`, `order_number`, `total_amount`, `id_order_item`, `id_production_order`, `stage`, `stage_total`, `id_warehouse` и другие поля из существующей схемы.

## 1. Добавить ключ

1. В Supabase откройте **Project Settings → API Keys**.
2. В блоке **Secret keys** скопируйте секретный ключ проекта (`sb_secret_...`). Не используйте Publishable key.
3. В корне проекта создайте `.env` рядом с `package.json`.
4. Заполните:

```env
PORT=3000
SUPABASE_URL=https://armsafizuyzgokahqscd.supabase.co
SUPABASE_SECRET_KEY=ваш_секретный_ключ
```

Сервер также поддерживает старое имя переменной `SUPABASE_SERVICE_ROLE_KEY`. Никогда не помещайте этот ключ в файлы `Public/` и не отправляйте `.env` в GitHub.

## 2. Запуск и проверка

```bash
npm install
npm start
```

Откройте `http://localhost:3000/api/health`. При успешном подключении будет `"database":"connected"`. Затем проверьте страницы комплектующих, заявок, агентов, склада, производства и рабочего кабинета.

## 3. Что берётся из БД

- Комплектующие — `components`
- Заявки — `orders` и связанный `agents`
- Агенты — `agents`
- Склад — `warehouse` и связанный `components`
- Производство — `production_orders`, связанные `orders` и `agents`
- Главная/дашборд — сводные показатели по заявкам, складу и агентам


## Важно

В приложении пока нет полноценной авторизации и разграничения ролей. API Express отдаёт данные всем, кто может открыть сайт. Это учебный прототип: не используйте реальные персональные и коммерческие данные до добавления авторизации и проверки прав доступа.
