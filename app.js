require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Public')));

// Supabase работает только на сервере. Secret key не передаётся в браузер.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function requireDatabase(req, res, next) {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase не настроен. Заполните SUPABASE_URL и SUPABASE_SECRET_KEY в .env.' });
  }
  next();
}

// Проверяем access token через Supabase Auth и загружаем роль из доверенной таблицы.
const rolePermissions = {
  'Руководитель': ['dashboard', 'components', 'orders', 'production', 'warehouse', 'agents'],
  'Менеджер': ['dashboard', 'components', 'orders', 'production', 'warehouse', 'agents'],
  'Мастер производства': ['dashboard', 'components', 'production'],
  'Кладовщик': ['dashboard', 'components', 'warehouse'],
  'Агент': ['dashboard', 'components', 'orders']
};

async function requireAuth(req, res, next) {
  if (!supabase) return res.status(503).json({ error: 'Supabase не настроен.' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Войдите в систему.' });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return res.status(401).json({ error: 'Сессия истекла. Войдите снова.' });
  // Запрашиваем профиль от имени вошедшего пользователя. Это важно, если в .env
  // указан publishable/anon key: обычный серверный клиент без JWT не проходит RLS
  // и ошибочно сообщает, что профиль отсутствует, хотя строка есть в базе.
  const userClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: profile, error: profileError } = await userClient
    .from('users')
    .select('id_user, full_name, email, id_role')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Supabase profile lookup:', profileError.message);
    return res.status(500).json({ error: 'Не удалось загрузить профиль. Проверьте ключ Supabase в .env и доступ к таблице users.' });
  }
  if (!profile) {
    return res.status(403).json({ error: 'Профиль для этого аккаунта ещё не появился. Обновите страницу через несколько секунд. Если ошибка повторяется, проверьте триггер on_auth_user_created в Supabase.' });
  }

  const { data: role, error: roleError } = await userClient
    .from('roles').select('role_name').eq('id_role', profile.id_role).maybeSingle();
  if (roleError) {
    console.error('Supabase role lookup:', roleError.message);
    return res.status(500).json({ error: 'Не удалось определить роль сотрудника.' });
  }
  req.user = { ...authData.user, profile, role: role?.role_name || 'Без роли' };
  req.userClient = userClient;
  next();
}

function allowPage(page) {
  return (req, res, next) => {
    const allowed = rolePermissions[req.user.role] || [];
    if (!allowed.includes(page)) {
      if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'У вашей роли нет доступа к этому разделу.' });
      return res.status(403).sendFile(path.join(__dirname, 'Public', '403.html'));
    }
    next();
  };
}

async function sendQuery(res, table, query) {
  const { data, error } = await query;
  if (error) {
    console.error(`Supabase ${table}:`, error.message);
    return res.status(500).json({ error: `Не удалось получить данные из таблицы ${table}.` });
  }
  return res.json(data || []);
}

app.get('/api/health', async (req, res) => {
  if (!supabase) return res.status(503).json({ app: 'ok', databaseConfigured: false, database: 'not_configured' });
  const { error } = await supabase.from('roles').select('id_role').limit(1);
  return res.status(error ? 503 : 200).json({
    app: 'ok', databaseConfigured: true, database: error ? 'error' : 'connected',
    message: error ? error.message : 'Supabase connection successful'
  });
});

app.get('/api/me', requireAuth, (req, res) => res.json({
  id: req.user.id, email: req.user.email, profile: req.user.profile, role: req.user.role
}));

// Названия столбцов соответствуют уже существующей БД Supabase.
app.get('/api/components', requireAuth, allowPage('components'), (req, res) =>
  sendQuery(res, 'components', supabase.from('components').select('*').order('id_component')));
app.get('/api/orders', requireAuth, allowPage('orders'), (req, res) =>
  sendQuery(res, 'orders', supabase.from('orders').select('*, agents(agent_name)').order('order_number', { ascending: false })));
app.get('/api/agents', requireAuth, allowPage('agents'), (req, res) =>
  sendQuery(res, 'agents', supabase.from('agents').select('*').order('id_agent')));
app.get('/api/warehouse', requireAuth, allowPage('warehouse'), (req, res) =>
  sendQuery(res, 'warehouse', supabase.from('warehouse').select('*, components(component_name, image, category)').order('id_warehouse')));
app.get('/api/production', requireAuth, allowPage('production'), (req, res) =>
  sendQuery(res, 'production_orders', supabase.from('production_orders').select('*, orders(order_number, pc_name, agents(agent_name))').order('id_production_order', { ascending: false })));

app.get('/api/dashboard', requireAuth, allowPage('dashboard'), async (req, res) => {
  const [ordersResult, agentsResult, warehouseResult, productionResult] = await Promise.all([
    supabase.from('orders').select('id_order, order_number, pc_name, id_agent, status, total_amount, agents(agent_name)').order('order_number', { ascending: false }),
    supabase.from('agents').select('id_agent'),
    supabase.from('warehouse').select('quantity, status, components(component_name, category)'),
    supabase.from('production_orders').select('id_production_order')
  ]);
  const error = ordersResult.error || agentsResult.error || warehouseResult.error || productionResult.error;
  if (error) {
    console.error('Supabase dashboard:', error.message);
    return res.status(500).json({ error: 'Не удалось загрузить данные рабочего кабинета.' });
  }
  const orders = ordersResult.data || [];
  const warehouse = warehouseResult.data || [];
  const normalized = value => String(value || '').toLowerCase();
  const isNew = value => /new|нов|создан/.test(normalized(value));
  const isProduction = value => /production|производ|сборк/.test(normalized(value));
  const isCritical = row => /крит|low|мало|нет/.test(normalized(row.status));
  return res.json({
    newOrders: orders.filter(x => isNew(x.status)).length,
    productionOrders: (productionResult.data || []).length || orders.filter(x => isProduction(x.status)).length,
    criticalStock: warehouse.filter(isCritical).length,
    agentsCount: (agentsResult.data || []).length,
    stockUnits: warehouse.reduce((sum, x) => sum + Number(x.quantity || 0), 0),
    latestOrders: orders.slice(0, 4),
    warehouse: warehouse.slice(0, 5)
  });
});


// Перемещение заказа производства между этапами.
async function changeProductionStage(req, res, direction) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Некорректный номер производственного заказа.' });

  const { data: production, error: findError } = await req.userClient
    .from('production_orders')
    .select('id_production_order, id_order, stage, stage_total')
    .eq('id_production_order', id)
    .maybeSingle();

  if (findError || !production) {
    console.error('Supabase production lookup:', findError?.message);
    return res.status(findError ? 500 : 404).json({ error: 'Производственный заказ не найден.' });
  }

  const total = Math.max(Number(production.stage_total || 1), 1);
  const currentStage = Math.min(Math.max(Number(production.stage || 0), 0), total);
  const nextStage = direction === 'next' ? Math.min(currentStage + 1, total) : Math.max(currentStage - 1, 0);

  if (nextStage === currentStage) {
    return res.status(400).json({ error: direction === 'next' ? 'Заказ уже прошёл все этапы.' : 'Это первый этап, возвращаться больше некуда.' });
  }

  const nextStatus = nextStage === 0
    ? 'Ожидает комплектующие'
    : nextStage >= total
      ? 'Контроль качества'
      : 'Сборка';

  const { data: updatedProduction, error: updateError } = await req.userClient
    .from('production_orders')
    .update({ stage: nextStage, status: nextStatus })
    .eq('id_production_order', id)
    .select('id_production_order, stage, stage_total, status')
    .maybeSingle();

  if (updateError) {
    console.error('Supabase production update:', updateError.message);
    return res.status(500).json({ error: `Не удалось обновить этап: ${updateError.message}` });
  }
  if (!updatedProduction) {
    return res.status(403).json({ error: 'База не разрешила изменить этап. Проверьте права UPDATE для production_orders.' });
  }

  // Завершённый заказ возвращается в производство, если его откатили назад.
  const orderStatus = nextStage >= total ? 'Готово' : nextStage === 0 ? 'Ожидает комплектующие' : 'В производстве';
  const { error: orderError } = await req.userClient
    .from('orders')
    .update({ status: orderStatus })
    .eq('id_order', production.id_order);

  if (orderError) {
    console.error('Supabase order status update:', orderError.message);
    return res.status(500).json({ error: 'Этап изменён, но статус заявки не удалось обновить.' });
  }

  return res.json({ success: true, stage: nextStage, stageTotal: total, status: nextStatus });
}

app.post('/api/production/:id/next', requireAuth, allowPage('production'), (req, res) =>
  changeProductionStage(req, res, 'next'));
app.post('/api/production/:id/previous', requireAuth, allowPage('production'), (req, res) =>
  changeProductionStage(req, res, 'previous'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'index.html')));
app.get('/components', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'components.html')));
app.get('/orders', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'orders.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'dashboard.html')));
app.get('/production', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'production.html')));
app.get('/warehouse', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'warehouse.html')));
app.get('/agents', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'agents.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'login.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'profile.html')));
app.get('/robots.txt', (req, res) => res.type('text/plain').sendFile(path.join(__dirname, 'robots.txt')));
app.get('/sitemap.xml', (req, res) => res.type('application/xml').sendFile(path.join(__dirname, 'sitemap.xml')));

app.listen(PORT, () => console.log(`Сайт запущен: http://localhost:${PORT}`));
