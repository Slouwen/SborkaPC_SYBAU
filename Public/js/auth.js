// Авторизация Supabase. Publishable key предназначен для использования в браузере.
const SUPABASE_URL = 'https://armsafizuyzgokahqscd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_l9wFuHnLS4_ZNvAHjiba7w_FS8rEb8s';
const authClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const pageAccess = {
  'Руководитель': ['/', '/dashboard', '/components', '/orders', '/production', '/warehouse', '/agents', '/profile'],
  'Менеджер': ['/', '/dashboard', '/components', '/orders', '/production', '/warehouse', '/agents', '/profile'],
  'Мастер производства': ['/', '/dashboard', '/components', '/production', '/profile'],
  'Кладовщик': ['/', '/dashboard', '/components', '/warehouse', '/profile'],
  'Агент': ['/', '/dashboard', '/components', '/orders', '/profile']
};

async function authApi(url) {
  const { data: { session } } = await authClient.auth.getSession();
  const response = await fetch(url, { headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Ошибка запроса');
  return body;
}

function authMessage(element, message, type='error') {
  element.textContent = message;
  element.className = `mt-4 text-sm ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
}

async function getCurrentProfile() {
  return authApi('/api/me');
}

function addUserControls(userInfo) {
  const header = document.querySelector('header');
  if (!header || document.getElementById('user-menu')) return;
  const wrap = document.createElement('div');
  wrap.id = 'user-menu';
  wrap.className = 'flex items-center gap-3 text-sm';
  const fullName = userInfo.profile.full_name || userInfo.email;
  wrap.innerHTML = `<a href="/profile" class="text-right hover:text-blue-600"><span class="block font-semibold">${safeText(fullName)}</span><span class="block text-xs text-slate-500">${safeText(userInfo.role)}</span></a><button id="logout-button" class="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">Выйти</button>`;
  const headerActions = header.querySelector(':scope > div');
  if (headerActions) headerActions.append(wrap); else header.append(wrap);
  document.getElementById('logout-button').addEventListener('click', async () => {
    await authClient.auth.signOut();
    location.replace('/login');
  });
}

function safeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function applyRoleNavigation(role) {
  const allowed = pageAccess[role] || [];
  document.querySelectorAll('aside nav a').forEach(link => {
    const path = new URL(link.href).pathname;
    if (!allowed.includes(path)) link.remove();
  });
  let current = location.pathname.replace(/\.html$/, '');
  if (current === '/index') current = '/';
  if (!allowed.includes(current)) location.replace('/403.html');
}

async function protectPage() {
  if (location.pathname === '/login' || location.pathname === '/login.html') return;
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) { location.replace('/login'); return; }
  try {
    const me = await getCurrentProfile();
    addUserControls(me);
    applyRoleNavigation(me.role);
    if (location.pathname === '/profile') renderProfile(me);
  } catch (error) {
    if (error.message.includes('Профиль сотрудника')) {
      document.body.innerHTML = `<main class="min-h-screen flex items-center justify-center p-6"><div class="max-w-lg bg-white dark:bg-slate-800 rounded-2xl p-8 shadow"><h1 class="text-xl font-bold mb-3">Профиль ещё не создан</h1><p class="text-slate-600 dark:text-slate-300">${safeText(error.message)}</p><button id="profile-logout" class="mt-5 px-4 py-2 rounded-lg bg-blue-600 text-white">Выйти</button></div></main>`;
      document.getElementById('profile-logout').onclick = async () => { await authClient.auth.signOut(); location.replace('/login'); };
    } else {
      await authClient.auth.signOut(); location.replace('/login');
    }
  }
}

function renderProfile(me) {
  const root = document.getElementById('profile-content');
  if (!root) return;
  root.innerHTML = `<div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-4"><div><p class="text-sm text-slate-500">ФИО</p><p class="font-semibold">${safeText(me.profile.full_name || '—')}</p></div><div><p class="text-sm text-slate-500">Электронная почта</p><p class="font-semibold">${safeText(me.email)}</p></div><div><p class="text-sm text-slate-500">Роль сотрудника</p><p class="font-semibold">${safeText(me.role)}</p></div><p class="text-xs text-slate-500">Роль назначается в базе данных и не может быть изменена из личного кабинета.</p></div>`;
}

async function setupLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;
  const message = document.getElementById('auth-message');
  const loginPanel = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');
  document.getElementById('show-register').onclick = () => { loginPanel.classList.add('hidden'); registerPanel.classList.remove('hidden'); message.textContent=''; };
  document.getElementById('show-login').onclick = () => { registerPanel.classList.add('hidden'); loginPanel.classList.remove('hidden'); message.textContent=''; };

  const { data: { session } } = await authClient.auth.getSession();
  if (session) location.replace('/');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const { error } = await authClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      location.replace('/');
    } catch (error) { authMessage(message, error.message); }
    finally { button.disabled = false; }
  });

  document.getElementById('register-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
      const fullName = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      if (password.length < 8) throw new Error('Пароль должен содержать минимум 8 символов.');
      const { data, error } = await authClient.auth.signUp({
        email, password,
        options: { data: { full_name: fullName }, emailRedirectTo: `${location.origin}/` }
      });
      if (error) throw error;
      if (!data.session) {
        authMessage(message, 'Письмо для подтверждения отправлено. Откройте почту и перейдите по ссылке из письма.', 'success');
      } else {
        authMessage(message, 'Регистрация завершена. Открываем сайт…', 'success');
        location.replace('/');
      }
    } catch (error) { authMessage(message, error.message); }
    finally { button.disabled = false; }
  });

}

document.addEventListener('DOMContentLoaded', () => {
  setupLoginPage();
  if (location.pathname !== '/login' && location.pathname !== '/login.html') protectPage();
});
