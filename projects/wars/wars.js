/*
 * WARS demo page — no dependencies.
 * Language & theme switches, header state, the score calculator and the
 * "load this finding" buttons. The page stays readable without JavaScript.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(selector, context) { return (context || document).querySelector(selector); }
  function $$(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }
  function save(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ } }
  function load(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }

  /* ------------------------------------------------------------------ i18n */

  // English strings that only exist in JavaScript (the rest is in index.html).
  var UI_EN = {
    'band.p1': 'Critical',
    'band.p2': 'High',
    'band.p3': 'Moderate',
    'band.p4': 'Low',
    'band.p5': 'Informational',
    'cvss.critical': 'Critical',
    'cvss.high': 'High',
    'cvss.medium': 'Medium',
    'cvss.low': 'Low',
    'cvss.none': 'None',
    'status.score': 'WARS score {score}: {band}, {name}.',
    'status.loaded': '{asset} loaded into the calculator.'
  };

  var dictionaries = window.I18N || {};
  var lang = root.getAttribute('data-lang') === 'fr' ? 'fr' : 'en';
  var originals = new Map();
  var metaDescription = $('meta[name="description"]');
  var originalTitle = document.title;
  var originalDescription = metaDescription ? metaDescription.getAttribute('content') : '';

  function dictionary() { return lang === 'en' ? null : dictionaries[lang] || null; }

  function t(key) {
    var dict = dictionary();
    if (dict && Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    return UI_EN[key] || '';
  }

  function remember(el) {
    if (!originals.has(el)) originals.set(el, { html: el.innerHTML, attrs: {} });
    return originals.get(el);
  }

  function translateElement(el) {
    var dict = dictionary();
    var saved = remember(el);
    var key = el.getAttribute('data-i18n');
    if (key) {
      var html = dict && dict[key];
      el.innerHTML = html != null ? html : saved.html;
    }
    var spec = el.getAttribute('data-i18n-attr');
    if (spec) {
      spec.split(';').forEach(function (pair) {
        var index = pair.indexOf(':');
        var name = pair.slice(0, index).trim();
        var attrKey = pair.slice(index + 1).trim();
        if (!name || !attrKey) return;
        if (!(name in saved.attrs)) saved.attrs[name] = el.getAttribute(name);
        var value = dict && dict[attrKey];
        el.setAttribute(name, value != null ? value : saved.attrs[name]);
      });
    }
  }

  function formatNumber(value, digits) {
    try {
      return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }).format(value);
    } catch (e) {
      var text = Number(value).toFixed(digits);
      return lang === 'fr' ? text.replace('.', ',') : text;
    }
  }

  // Numbers written in the HTML (data-num) follow the page language: 82.9 / 82,9.
  function formatStaticNumbers() {
    $$('[data-num]').forEach(function (el) {
      var digits = el.hasAttribute('data-digits') ? parseInt(el.getAttribute('data-digits'), 10) : 1;
      el.textContent = formatNumber(parseFloat(el.getAttribute('data-num')), digits);
    });
  }

  function applyLanguage(next) {
    lang = next === 'fr' ? 'fr' : 'en';
    var dict = dictionary();
    $$('[data-i18n], [data-i18n-attr]').forEach(translateElement);
    document.title = (dict && dict['meta.title']) || originalTitle;
    if (metaDescription) metaDescription.setAttribute('content', (dict && dict['meta.description']) || originalDescription);
    root.setAttribute('lang', lang);
    root.setAttribute('data-lang', lang);
    $$('[data-set-lang]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-set-lang') === lang));
    });
    formatStaticNumbers();
    updateCalculator(false);
    root.classList.remove('i18n-pending');
  }

  $$('[data-set-lang]').forEach(function (button) {
    button.addEventListener('click', function () {
      var next = button.getAttribute('data-set-lang');
      if (next === lang) return;
      save('lang', next);
      // A ?lang= parameter would override the saved choice on reload: drop it.
      if (/[?&]lang=/.test(window.location.search) && window.URL && window.history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.delete('lang');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
      applyLanguage(next);
    });
  });

  /* ----------------------------------------------------------------- theme */

  var themeButton = $('#theme-toggle');

  function setTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) save('theme', theme);
    var dark = theme === 'dark';
    if (themeButton) themeButton.setAttribute('aria-pressed', String(dark));
    $$('meta[name="theme-color"]').forEach(function (meta) {
      meta.setAttribute('content', dark ? '#0e0c0a' : '#f6f1e9');
    });
  }

  if (themeButton) {
    themeButton.addEventListener('click', function () {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }
  setTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);

  var lightQuery = window.matchMedia('(prefers-color-scheme: light)');
  if (lightQuery.addEventListener) {
    lightQuery.addEventListener('change', function (event) {
      if (!load('theme')) setTheme(event.matches ? 'light' : 'dark', false);
    });
  }

  /* ---------------------------------------------------------------- header */

  var header = $('#site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------ calculator */

  var calc = $('#wars-calc');
  var FACTORS = ['s', 'l', 'e', 'ac', 'bi'];
  var DIGITS = { s: 2, l: 2, e: 2, ac: 1, bi: 1 };
  var N = 1 * 1 * 0.8 * 2 * 2;   // highest possible S × L × E × AC × BI, so scores run 0–100
  var KEV_FLOOR = 80;            // known exploitation keeps a finding in the P1 band
  var PRESETS = {
    'static': { s: 0.98, l: 0.05, e: 0.4, ac: 1, bi: 1, kev: false },
    portal: { s: 0.98, l: 0.94, e: 0.8, ac: 2, bi: 1.8, kev: true }
  };

  function bandFor(score) {
    if (score >= 80) return 'p1';
    if (score >= 60) return 'p2';
    if (score >= 35) return 'p3';
    if (score >= 15) return 'p4';
    return 'p5';
  }

  // CVSS v3 qualitative severity scale.
  function cvssSeverity(cvss) {
    if (cvss >= 9) return 'critical';
    if (cvss >= 7) return 'high';
    if (cvss >= 4) return 'medium';
    if (cvss > 0) return 'low';
    return 'none';
  }

  function round1(value) { return Math.round(value * 10) / 10; }

  function readValues() {
    var values = { kev: calc.elements.kev.checked };
    FACTORS.forEach(function (name) { values[name] = parseFloat(calc.elements[name].value); });
    return values;
  }

  function scoreOf(values) {
    var raw = values.s * values.l * values.e * values.ac * values.bi / N * 100;
    var score = values.kev ? Math.max(raw, KEV_FLOOR) : raw;
    score = round1(Math.min(100, Math.max(0, score)));
    return { raw: round1(raw), score: score, band: bandFor(score), floored: values.kev && raw < KEV_FLOOR };
  }

  function statusText(result) {
    return t('status.score')
      .replace('{score}', formatNumber(result.score, 1))
      .replace('{band}', result.band.toUpperCase())
      .replace('{name}', t('band.' + result.band));
  }

  function updateCalculator(announce) {
    if (!calc) return null;
    var values = readValues();
    var result = scoreOf(values);

    FACTORS.forEach(function (name) {
      $('#o-' + name).textContent = formatNumber(values[name], DIGITS[name]);
    });
    $('#wars-score').textContent = formatNumber(result.score, 1);
    $('#calc-result').setAttribute('data-band', result.band);
    $('#wars-band').textContent = result.band.toUpperCase();
    $('#wars-band-name').textContent = t('band.' + result.band);
    $('#wars-marker').style.left = result.score + '%';

    $('#kev-floor').hidden = !result.floored;
    var raw = $('#wars-raw');   // re-queried: translation re-creates it
    if (raw) raw.textContent = formatNumber(result.raw, 1);

    var cvss = Math.round(values.s * 100) / 10;   // S is CVSS ÷ 10
    $('#cvss-value').textContent = formatNumber(cvss, 1);
    $('#cvss-sev').textContent = t('cvss.' + cvssSeverity(cvss));

    $('#wars-product').textContent = '(' + FACTORS.map(function (name) {
      return formatNumber(values[name], DIGITS[name]);
    }).join(' × ') + ') ÷ ' + formatNumber(N, 1) + ' × 100 = ' + formatNumber(result.raw, 1);

    Object.keys(PRESETS).forEach(function (name) {
      var preset = PRESETS[name];
      var matches = values.kev === preset.kev && FACTORS.every(function (factor) {
        return Math.abs(values[factor] - preset[factor]) < 1e-6;
      });
      var button = $('[data-preset="' + name + '"]', calc);
      if (button) button.setAttribute('aria-pressed', String(matches));
    });

    if (announce) $('#calc-status').textContent = statusText(result);
    return result;
  }

  function setValues(values) {
    FACTORS.forEach(function (name) { calc.elements[name].value = values[name]; });
    calc.elements.kev.checked = values.kev;
  }

  if (calc) {
    calc.addEventListener('input', function () { updateCalculator(false); });
    // Announce the result once a slider is released (not on every step).
    calc.addEventListener('change', function () { updateCalculator(true); });
    calc.addEventListener('submit', function (event) { event.preventDefault(); });

    $$('[data-preset]', calc).forEach(function (button) {
      button.addEventListener('click', function () {
        setValues(PRESETS[button.getAttribute('data-preset')]);
        updateCalculator(true);
      });
    });

    // "Load into the calculator" buttons in the ranking.
    $$('.try[data-example]').forEach(function (button) {
      button.addEventListener('click', function () {
        var values = { kev: button.getAttribute('data-kev') === 'true' };
        FACTORS.forEach(function (name) { values[name] = parseFloat(button.getAttribute('data-' + name)); });
        setValues(values);
        var result = updateCalculator(false);

        var item = button.closest('.rank__item');
        var asset = item ? $('.rank__name b', item).textContent : '';
        $('#calc-status').textContent = t('status.loaded').replace('{asset}', asset) + ' ' + statusText(result);

        calc.elements.s.focus({ preventScroll: true });
        calc.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        var card = $('#calc-result');
        card.classList.remove('is-flash');
        void card.offsetWidth;   // restart the highlight animation
        card.classList.add('is-flash');
      });
    });
  }

  /* ----------------------------------------------------------------- misc */

  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  applyLanguage(lang);
})();
