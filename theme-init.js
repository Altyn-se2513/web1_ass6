/* Theme init — loaded in <head> BEFORE the page is drawn,
   so the saved Day/Night theme is applied without a white "flash".
   It also restores the accent color chosen on the Contact page,
   so the accent works on EVERY page, not only on Contact. */
(function () {
  var root = document.documentElement;

  var theme = localStorage.getItem('bc_theme');
  if (!theme) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);

  var accent = localStorage.getItem('bc_accent');
  if (accent) root.style.setProperty('--primary', accent);
})();