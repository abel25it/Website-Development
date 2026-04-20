(function () {
    var root = document.documentElement;
    var buttons = document.querySelectorAll('.theme-toggle');
    if (!buttons.length) {
        return;
    }

    var storageKey = 'la-pizzeriaa-theme';

    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        buttons.forEach(function (button) {
            button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
            button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            button.title = theme === 'dark' ? 'Light mode' : 'Dark mode';
            button.textContent = theme === 'dark' ? '☀' : '☾';
        });
        window.localStorage.setItem(storageKey, theme);
    }

    var savedTheme = window.localStorage.getItem(storageKey);
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    buttons.forEach(function (button) {
        button.addEventListener('click', function () {
            var currentTheme = root.getAttribute('data-theme');
            setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
    });
})();
