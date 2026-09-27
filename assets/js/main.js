/*
 * Portfolio behaviour — no dependencies.
 * Language & theme switches, header and mobile menu, scroll-spy, scroll reveal,
 * project filters, copy-to-clipboard and the video dialog. The page stays fully readable without JavaScript.
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
    'ui.copyFailed': 'Couldn’t copy — please select the address manually.'
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
