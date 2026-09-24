/*
 * Portfolio behaviour — no dependencies.
 * Language & theme switches, header and mobile menu, scroll-spy, scroll reveal,
 * hero terminal animation, project filters, WARS calculator, copy-to-clipboard
 * and the video dialog. The page stays fully readable without JavaScript.
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
    'ui.copied': 'Copied!',
    'ui.copiedStatus': 'Email address copied to the clipboard.',
    'ui.copyFailed': 'Couldn’t copy — please select the address manually.',
    'calc.band.p1': 'Critical',
    'calc.band.p2': 'High',
    'calc.band.p3': 'Moderate',
    'calc.band.p4': 'Low',
    'calc.band.p5': 'Informational'
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
    updateCalculator();
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

  // Follow the operating system while the visitor hasn't picked a theme.
  var lightQuery = window.matchMedia('(prefers-color-scheme: light)');
  if (lightQuery.addEventListener) {
    lightQuery.addEventListener('change', function (event) {
      if (!load('theme')) setTheme(event.matches ? 'light' : 'dark', false);
    });
  }

  /* ------------------------------------------------- header & mobile menu */

  var header = $('#site-header');
  var menuButton = $('#menu-toggle');

  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  }

  menuButton.addEventListener('click', function () {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });
  $$('.nav__link').forEach(function (link) {
    link.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener('click', function (event) {
    if (header.classList.contains('menu-open') && !header.contains(event.target)) setMenu(false);
  });
  var desktopQuery = window.matchMedia('(min-width: 901px)');
  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener('change', function (event) { if (event.matches) setMenu(false); });
  }

  /* ------------------------------------------------------------ scroll-spy */

  var navLinks = $$('.nav__link');

  function setActive(id) {
    navLinks.forEach(function (link) {
      var active = link.getAttribute('href') === '#' + id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'about', 'experience', 'projects', 'skills', 'contact'].forEach(function (id) {
      var section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  /* --------------------------------------------------------- scroll reveal */

  if (!reduceMotion && 'IntersectionObserver' in window) {
    root.classList.add('reveal-ready');
    var revealer = new IntersectionObserver(function (entries) {
      var index = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Math.min(index++, 5) * 70;
        el.style.setProperty('--delay', delay + 'ms');
        el.classList.add('is-visible');
        revealer.unobserve(el);
        // Hand the element back to its normal styles (hover transitions etc.).
        window.setTimeout(function () {
          el.classList.remove('reveal', 'is-visible');
          el.style.removeProperty('--delay');
        }, 800 + delay);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    $$('.reveal').forEach(function (el) { revealer.observe(el); });
  }

  /* ------------------------------------------------------ hero terminal */

  var terminal = $('#terminal');
  if (terminal && !reduceMotion) {
    var pre = $('.terminal__body', terminal);
    var lines = $$('.t-line', terminal);
    pre.style.minHeight = pre.offsetHeight + 'px';
    terminal.classList.add('is-typing');
    var lineIndex = 0;

    var typeLine = function (line, done) {
      line.classList.add('is-shown');
      var command = $('.t-cmd', line);
      if (!command) {
        window.setTimeout(done, line.classList.contains('t-gap') ? 60 : 120);
        return;
      }
      var text = command.textContent;
      var shown = 0;
      command.textContent = '';
      (function tick() {
        shown += 1;
        command.textContent = text.slice(0, shown);
        if (shown < text.length) window.setTimeout(tick, 18 + Math.random() * 22);
        else window.setTimeout(done, 280);
      })();
    };

    var nextLine = function () {
      if (lineIndex >= lines.length) {
        terminal.classList.remove('is-typing');
        pre.style.minHeight = '';
        return;
      }
      typeLine(lines[lineIndex++], nextLine);
    };
    window.setTimeout(nextLine, 400);
  }

  /* ------------------------------------------------------ project filters */

  var filters = $$('.filter');
  var projects = $$('.project');

  filters.forEach(function (button) {
    button.addEventListener('click', function () {
      var category = button.getAttribute('data-filter');
      filters.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
      projects.forEach(function (project) {
        var show = category === 'all' || project.getAttribute('data-category') === category;
        project.classList.remove('reveal', 'is-visible');
        project.hidden = !show;
        if (show && !reduceMotion && project.animate) {
          project.animate(
            [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
            { duration: 340, easing: 'cubic-bezier(.2, .7, .2, 1)' }
          );
        }
      });
    });
  });

  /* ------------------------------------------------------ WARS calculator */

  var calc = $('#wars-calc');
  var FACTORS = ['s', 'l', 'e', 'ac', 'bi'];
  var MAX_PRODUCT = 1 * 1 * 0.8 * 2 * 2; // N: highest possible S × L × E × AC × BI
  var KEV_FLOOR = 80;                    // a KEV match can't fall below the P1 band
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

  function formatNumber(value, digits) {
    var text = Number(value).toFixed(digits);
    return lang === 'fr' ? text.replace('.', ',') : text;
  }

  function updateCalculator() {
    if (!calc) return;
    var values = {};
    FACTORS.forEach(function (name) { values[name] = parseFloat(calc.elements[name].value); });
    var kev = calc.elements.kev.checked;
    var score = (values.s * values.l * values.e * values.ac * values.bi) / MAX_PRODUCT * 100;
    if (kev) score = Math.max(score, KEV_FLOOR);
    score = Math.min(100, Math.max(0, score));
    var band = bandFor(score);

    FACTORS.forEach(function (name) {
      $('#o-' + name).textContent = formatNumber(values[name], name === 'ac' || name === 'bi' ? 1 : 2);
    });
    $('#wars-score').textContent = formatNumber(score, 1);
    $('#calc-result').setAttribute('data-band', band);
    $('#wars-band').textContent = band.toUpperCase();
    $('#wars-band-name').textContent = t('calc.band.' + band);
    $('#wars-meter').style.width = score.toFixed(1) + '%';

    Object.keys(PRESETS).forEach(function (name) {
      var preset = PRESETS[name];
      var matches = kev === preset.kev && FACTORS.every(function (factor) {
        return Math.abs(values[factor] - preset[factor]) < 1e-6;
      });
      var button = $('[data-preset="' + name + '"]', calc);
      if (button) button.setAttribute('aria-pressed', String(matches));
    });
  }

  if (calc) {
    calc.addEventListener('input', updateCalculator);
    calc.addEventListener('change', updateCalculator);
    calc.addEventListener('submit', function (event) { event.preventDefault(); });
    $$('[data-preset]', calc).forEach(function (button) {
      button.addEventListener('click', function () {
        var preset = PRESETS[button.getAttribute('data-preset')];
        FACTORS.forEach(function (name) { calc.elements[name].value = preset[name]; });
        calc.elements.kev.checked = preset.kev;
        updateCalculator();
      });
    });
  }

  /* ------------------------------------------------------- copy to clipboard */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.className = 'visually-hidden';
      document.body.appendChild(field);
      field.select();
      try {
        if (document.execCommand('copy')) resolve();
        else reject(new Error('copy failed'));
      } catch (error) {
        reject(error);
      } finally {
        document.body.removeChild(field);
      }
    });
  }

  $$('[data-copy]').forEach(function (button) {
    var label = $('.copy-label', button);
    var status = $('#copy-status');
    var timer;
    button.addEventListener('click', function () {
      copyText(button.getAttribute('data-copy')).then(function () {
        button.classList.add('is-copied');
        label.textContent = t('ui.copied');
        if (status) status.textContent = t('ui.copiedStatus');
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          button.classList.remove('is-copied');
          translateElement(label);
          if (status) status.textContent = '';
        }, 2200);
      }, function () {
        if (status) status.textContent = t('ui.copyFailed');
      });
    });
  });

  /* ---------------------------------------------------------- video dialog */

  var modal = $('#video-modal');
  if (modal && typeof modal.showModal === 'function') {
    var video = $('video', modal);
    $$('[data-video]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        if (!video.getAttribute('src')) video.setAttribute('src', link.getAttribute('data-video'));
        modal.showModal();
        var playing = video.play();
        if (playing && playing.catch) playing.catch(function () { /* the visitor can press play */ });
      });
    });
    $('[data-close]', modal).addEventListener('click', function () { modal.close(); });
    modal.addEventListener('click', function (event) { if (event.target === modal) modal.close(); });
    modal.addEventListener('close', function () { video.pause(); });
  }

  /* ----------------------------------------------------------------- misc */

  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  applyLanguage(lang);
})();
