/*
 * Runs before first paint (loaded without `defer` in <head>):
 * picks the colour theme and the language so the page never flashes
 * the wrong one. Everything else lives in main.js.
 */
(function () {
  var root = document.documentElement;

  function stored(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  // Theme: saved choice, otherwise the operating-system preference.
  var theme = stored('theme');
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  root.setAttribute('data-theme', theme);

  // Language: ?lang= in the URL, then saved choice, then browser languages.
  var lang = null;
  var match = /[?&]lang=(en|fr)\b/i.exec(window.location.search);
  if (match) lang = match[1].toLowerCase();
  if (!lang) lang = stored('lang');
  if (lang !== 'en' && lang !== 'fr') {
    lang = 'en';
    var prefs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < prefs.length; i++) {
      var code = String(prefs[i]).toLowerCase();
      if (code.indexOf('fr') === 0) { lang = 'fr'; break; }
      if (code.indexOf('en') === 0) break;
    }
  }
  root.setAttribute('data-lang', lang);
  root.classList.add('js');

  // The HTML is written in English; hide the page until main.js has applied French.
  if (lang === 'fr') {
    root.classList.add('i18n-pending');
    window.setTimeout(function () { root.classList.remove('i18n-pending'); }, 1500);
  }
})();
