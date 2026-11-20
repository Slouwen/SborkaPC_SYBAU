// Браузер обращается к Express API. Ключ Supabase в этот файл не попадает.
const money = value => new Intl.NumberFormat('ru-RU').format(Number(value || 0)) + ' ₽';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function normalizeStatus(value) {
  const s = String(value || '').toLowerCase();
  if (/new|нов|создан/.test(s)) return 'new';
  if (/confirm|соглас|подтверж/.test(s)) return 'confirmed';
  if (/production|производ|сборк/.test(s)) return 'production';
  if (/complete|заверш|готов/.test(s)) return 'completed';
  if (/cancel|отмен/.test(s)) return 'cancelled';
  return 'other';
}
const statusLabels = { new: 'Новая', confirmed: 'Подтверждена', production: 'В производстве', completed: 'Завершена', cancelled: 'Отменена', other: 'Без статуса' };
const statusClasses = { new: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200', confirmed: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200', production: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200', completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200', cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200', other: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200' };
async function apiGet(url) {
  const { data: { session } } = await authClient.auth.getSession();
  const response = await fetch(url, { headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Ошибка загрузки данных');
  return data;
}
function showLoadError(container, error) {
  if (container) container.innerHTML = `<div class="p-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">Не удалось загрузить данные: ${escapeHtml(error.message)}.</div>`;
}
function componentType(category) {
  const value = String(category || '').toLowerCase();
  if (value.includes('процесс')) return 'cpu';
  if (value.includes('видеокарт')) return 'gpu';
  if (value.includes('памят')) return 'ram';
  return 'other';
}
async function loadComponents() {
  const container = document.getElementById('cards-container'); if (!container) return;
  try {
    const rows = await apiGet('/api/components');
    container.innerHTML = rows.map(c => `<div class="component-card bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow" data-type="${componentType(c.category)}" data-name="${escapeHtml((c.component_name || '').toLowerCase())}"><div class="h-48 bg-slate-200 dark:bg-slate-700 overflow-hidden"><img src="${escapeHtml(c.image || '/images/cpu-intel-i5.jpg')}" alt="${escapeHtml(c.component_name)}" class="w-full h-full object-cover"></div><div class="p-6"><h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">${escapeHtml(c.component_name)}</h3><p class="text-sm text-slate-500 dark:text-slate-400 mb-4">${escapeHtml(c.category)}</p><div class="flex justify-between items-center"><span class="text-xl font-bold text-slate-800 dark:text-slate-100">${money(c.price)}</span><span class="px-3 py-1 ${c.quantity <= 10 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'} rounded-md text-xs font-semibold">${c.quantity} шт.</span></div></div></div>`).join('');
    if (typeof filterCards === 'function') filterCards();
  } catch (e) { showLoadError(container, e); }
}
async function loadOrders() {
  const body = document.getElementById('orders-table-body'); if (!body) return;
  try {
    const rows = await apiGet('/api/orders');
    body.innerHTML = rows.map(o => { const state = normalizeStatus(o.status); return `<tr class="order-row border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50" data-status="${state}" data-name="${escapeHtml((o.order_number+' '+(o.pc_name || '')+' '+(o.agents?.agent_name || '')).toLowerCase())}"><td class="py-4 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400">#${o.order_number}</td><td class="py-4 px-4 text-sm">${escapeHtml(o.agents?.agent_name || 'Без агента')}</td><td class="py-4 px-4 text-sm"><span class="px-3 py-1 ${statusClasses[state]} rounded-md text-xs font-semibold">${escapeHtml(o.status || statusLabels[state])}</span></td><td class="py-4 px-4 text-sm text-right">${money(o.total_amount)}</td></tr>`; }).join('');
    if (typeof filterOrders === 'function') filterOrders();
  } catch (e) { showLoadError(body, e); }
}
async function loadAgents() {
  const body = document.getElementById('agents-table-body'); if (!body) return;
  try {
    const rows = await apiGet('/api/agents');
    body.innerHTML = rows.map(a => `<tr class="agent-row border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50" data-name="${escapeHtml((a.agent_name+' '+(a.contact_person || '')).toLowerCase())}"><td class="py-4 px-4 text-sm font-medium text-blue-600 dark:text-blue-400">${escapeHtml(a.agent_name)}</td><td class="py-4 px-4 text-sm">${escapeHtml(a.contact_person || '—')}</td><td class="py-4 px-4 text-sm">${a.orders_count}</td><td class="py-4 px-4 text-sm font-semibold text-green-600 dark:text-green-400">${a.discount_percent}%</td><td class="py-4 px-4 text-sm text-right"><span class="px-3 py-1 ${a.agent_level === 'Высокий' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : a.agent_level === 'Новый' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'} rounded-md text-xs font-semibold">${escapeHtml(a.agent_level || a.status || '—')}</span></td></tr>`).join('');
    if (typeof filterAgents === 'function') filterAgents();
  } catch (e) { showLoadError(body, e); }
}
async function loadWarehouse() {
  if (!location.pathname.includes('warehouse')) return;
  const body = document.querySelector('tbody'); if (!body) return;
  try {
    const rows = await apiGet('/api/warehouse');
    body.innerHTML = rows.map(w => { const critical = /крит|низ|low|мало/i.test(String(w.status || '')); return `<tr class="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"><td class="py-4 px-4 text-sm"><div class="flex items-center gap-3"><img src="${escapeHtml(w.components?.image || '/images/warehouse-ssd.jpg')}" alt="${escapeHtml(w.components?.component_name || '')}" class="w-10 h-10 rounded-lg object-cover"><span>${escapeHtml(w.components?.component_name || 'Комплектующее')}</span></div></td><td class="py-4 px-4 text-sm">${w.quantity} шт.</td><td class="py-4 px-4 text-sm text-right"><span class="px-3 py-1 ${critical ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'} rounded-md text-xs font-semibold">${escapeHtml(w.status || (critical ? 'Критично' : 'Норма'))}</span></td></tr>`; }).join('');
  } catch (e) { showLoadError(body, e); }
}
async function loadProduction() {
  if (!location.pathname.includes('production')) return;
  const body = document.querySelector('tbody'); if (!body) return;
  try {
    const rows = await apiGet('/api/production');
    body.innerHTML = rows.map(p => {
      const total = Math.max(Number(p.stage_total || 1), 1);
      const stage = Number(p.stage || 0);
      const progress = Math.min(100, Math.round(stage / total * 100));
      const id = Number(p.id_production_order);
      const previousButton = stage > 0
        ? `<button type="button" data-production-previous="${id}" class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium">Предыдущий этап</button>`
        : '';
      const nextButton = stage < total
        ? `<button type="button" data-production-next="${id}" class="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium">${stage === total - 1 ? 'Завершить производство' : 'Следующий этап'}</button>`
        : '<span class="text-xs text-green-600 dark:text-green-400 font-semibold">Готово к отгрузке</span>';
      return `<tr class="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"><td class="py-4 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400">#${p.orders?.order_number || p.id_order}</td><td class="py-4 px-4 text-sm">${escapeHtml(p.orders?.agents?.agent_name || 'Без агента')}</td><td class="py-4 px-4 text-sm"><span class="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-xs font-semibold">${escapeHtml(p.status || 'В работе')}</span></td><td class="py-4 px-4 text-sm"><div class="flex items-center gap-2"><div class="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-blue-500" style="width:${progress}%"></div></div><span class="text-xs text-slate-500 dark:text-slate-400">${stage}/${total}</span></div></td><td class="py-4 px-4 text-sm"><div class="flex flex-wrap justify-end gap-2">${previousButton}${nextButton}</div></td></tr>`;
    }).join('');
  } catch (e) { showLoadError(body, e); }
}
async function loadDashboard() {
  const ordersBox = document.getElementById('dashboard-orders');
  const warehouseBox = document.getElementById('dashboard-warehouse');
  const stat = id => document.getElementById(id);
  if (!ordersBox && !warehouseBox && !stat('stat-new-orders')) return;
  try {
    const data = await apiGet('/api/dashboard');
    if (stat('stat-new-orders')) stat('stat-new-orders').textContent = data.newOrders;
    if (stat('stat-production-orders')) stat('stat-production-orders').textContent = data.productionOrders;
    if (stat('stat-stock-critical')) stat('stat-stock-critical').textContent = data.criticalStock;
    if (stat('stat-stock-units')) stat('stat-stock-units').textContent = data.stockUnits;
    if (stat('stat-agents')) stat('stat-agents').textContent = data.agentsCount;
    if (ordersBox) ordersBox.innerHTML = data.latestOrders.map(o => `<div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3"><div><p class="font-semibold text-blue-600 dark:text-blue-400">#${o.order_number}</p><p class="text-sm text-slate-500 dark:text-slate-400">${escapeHtml(o.agents?.agent_name || 'Без агента')} — ${escapeHtml(o.pc_name || 'Компьютер')}</p></div><span class="px-3 py-1 ${statusClasses[normalizeStatus(o.status)]} rounded-md text-xs font-semibold">${escapeHtml(o.status || 'Без статуса')}</span></div>`).join('') || '<p class="text-sm text-slate-500">Заявок пока нет</p>';
    if (warehouseBox) warehouseBox.innerHTML = data.warehouse.map(w => { const critical = /крит|низ|low|мало/i.test(String(w.status || '')); return `<div class="flex justify-between items-center"><span class="text-slate-600 dark:text-slate-300">${escapeHtml(w.components?.category || w.components?.component_name || 'Комплектующие')}</span><div class="flex items-center gap-3"><span class="text-sm text-slate-500 dark:text-slate-400">${w.quantity} шт.</span><span class="px-3 py-1 ${critical ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'} rounded-md text-xs font-semibold">${escapeHtml(w.status || (critical ? 'Критично' : 'Норма'))}</span></div></div>`; }).join('');
  } catch (e) { showLoadError(ordersBox || warehouseBox, e); }
}
async function changeProductionStage(id, direction, button) {
  const originalText = button?.textContent || '';
  if (button) { button.disabled = true; button.textContent = 'Обновление...'; }
  try {
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) throw new Error('Сессия не найдена. Войдите в аккаунт заново.');
    const response = await fetch(`/api/production/${id}/${direction}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Не удалось изменить этап');
    await loadProduction();
  } catch (error) {
    alert(error.message);
    if (button) { button.disabled = false; button.textContent = originalText; }
  }
}
document.addEventListener('click', event => {
  const nextButton = event.target.closest('[data-production-next]');
  const previousButton = event.target.closest('[data-production-previous]');
  if (nextButton) changeProductionStage(Number(nextButton.dataset.productionNext), 'next', nextButton);
  if (previousButton) changeProductionStage(Number(previousButton.dataset.productionPrevious), 'previous', previousButton);
});
document.addEventListener('DOMContentLoaded', () => {
  loadComponents(); loadOrders(); loadAgents(); loadWarehouse(); loadProduction(); loadDashboard();
});
