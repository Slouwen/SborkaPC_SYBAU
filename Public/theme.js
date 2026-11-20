// Единая тема для всех страниц приложения.
(function () {
    const THEME_KEY = 'theme';

    function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
        const button = document.getElementById('global-theme-toggle');
        if (button) {
            button.textContent = isDark ? '☀️' : '🌙';
            button.setAttribute('aria-label', isDark ? 'Включить светлую тему' : 'Включить тёмную тему');
            button.title = isDark ? 'Светлая тема' : 'Тёмная тема';
        }
    }

    // Применяем сохранённую тему сразу, не дожидаясь загрузки разметки.
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);

    window.toggleTheme = function () {
        const nextTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, nextTheme);
        applyTheme(nextTheme);
    };

    // Синхронизируем тему между одновременно открытыми страницами сайта.
    window.addEventListener('storage', function (event) {
        if (event.key === THEME_KEY) applyTheme(event.newValue || 'light');
    });

    document.addEventListener('DOMContentLoaded', function () {
        // На главных рабочих страницах переключатель уже находится в шапке.
        // Добавляем такой же доступный переключатель на вход, профиль и страницу 403.
        if (document.querySelector('[onclick*="toggleTheme"]')) return;
        const button = document.createElement('button');
        button.id = 'global-theme-toggle';
        button.type = 'button';
        button.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
        button.setAttribute('aria-label', 'Переключить тему');
        button.title = document.documentElement.classList.contains('dark') ? 'Светлая тема' : 'Тёмная тема';
        button.style.cssText = 'position:fixed;top:16px;right:16px;z-index:1000;width:42px;height:42px;border-radius:10px;background:#334155;color:#fff;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,.18);';
        button.addEventListener('click', window.toggleTheme);
        document.body.appendChild(button);
    });
})();
