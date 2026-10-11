/**
 * nav.js — shared navigation bar + footer, injected into every page.
 *
 * Usage: put <div id="site-nav"></div> near the top of <body> and
 * <div id="site-footer"></div> near the bottom, then load this script.
 *
 * Also owns the language switcher UI. It only remembers the choice
 * (localStorage) and calls window.applyTranslations(lang), which
 * translations.js provides. Every page loads translations.js BEFORE this
 * file, so the brand, links and footer below (their data-i18n keys) switch
 * language everywhere — including pages whose own content is English-only.
 */
(function () {
  const NAV_HTML = `
    <nav class="site-nav">
      <div class="site-nav__inner">
        <a class="site-nav__brand" href="/">
          <img class="site-nav__org-logo" src="/images/SACTH_Symbol-1.webp" alt="SACTH logo" width="40" height="40">
          <img class="site-nav__org-logo" src="/images/tcc_logo_symbol.webp" alt="The Cause Collective logo" width="40" height="40">
          <span data-i18n="nav_brand">NZ Tech Week — SACTH</span>
        </a>

        <button class="site-nav__toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>

        <div class="site-nav__menu" id="navMenu">
          <a href="/" data-nav="home" data-i18n="nav_home">Home</a>
          <a href="/register.html" data-nav="register" data-i18n="nav_register">Register</a>
          <a href="/faq.html" data-nav="faq" data-i18n="nav_faq">FAQ</a>
          <a href="#contact" data-nav="contact" data-i18n="nav_contact">Contact</a>

          <div class="site-nav__lang">
            <button class="site-nav__lang-btn" id="langToggle" type="button" aria-haspopup="listbox" aria-expanded="false">
              <span id="langCurrent">English</span> ▾
            </button>
            <ul class="site-nav__lang-menu" id="langMenu" role="listbox" hidden>
              <li role="option" data-lang="en">English</li>
              <li role="option" data-lang="mi">Te Reo Māori</li>
              <li role="option" data-lang="sm">Gagana Samoa</li>
              <li role="option" data-lang="to">Lea Faka-Tonga</li>
            </ul>
          </div>

          <a class="site-nav__admin" href="/admin.html" data-nav="admin" data-i18n="nav_admin">Admin</a>
        </div>
      </div>
    </nav>
  `;

  const FOOTER_HTML = `
    <footer class="site-footer" id="contact">
      <div class="site-footer__inner">
        <div class="site-footer__brand">
          <span class="site-nav__logo" aria-hidden="true">🌿</span>
          <span>Pou Hono</span>
        </div>
        <p class="site-footer__org" data-i18n="footer_org">A Cause Collective &amp; SACTH initiative</p>
        <ul class="site-footer__contact">
          <li><a href="mailto:sacth@thecausecollective.org.nz">sacth@thecausecollective.org.nz</a></li>
          <li><a href="tel:+6498692433">+64 9 869 2433</a></li>
          <li>15 Earl Richardson Ave, Wiri, Auckland 2104</li>
        </ul>
        <p class="site-footer__copy">&copy; <span id="footerYear"></span> The Cause Collective &amp; SACTH. <span data-i18n="footer_built">Built for NZ Tech Week.</span></p>
      </div>
    </footer>
  `;

  const LANG_LABELS = { en: 'English', mi: 'Te Reo Māori', sm: 'Gagana Samoa', to: 'Lea Faka-Tonga' };

  function injectSite() {
    const navSlot = document.getElementById('site-nav');
    const footerSlot = document.getElementById('site-footer');
    if (navSlot) navSlot.outerHTML = NAV_HTML;
    if (footerSlot) footerSlot.outerHTML = FOOTER_HTML;

    highlightActiveLink();
    wireMobileToggle();
    wireLangSwitcher();
    setFooterYear();
  }

  function highlightActiveLink() {
    const path = window.location.pathname.replace(/\/index\.html$/, '/');
    const map = { '/': 'home', '/register.html': 'register', '/faq.html': 'faq', '/admin.html': 'admin' };
    const current = map[path];
    if (!current) return;
    const link = document.querySelector(`[data-nav="${current}"]`);
    if (link) link.classList.add('is-active');
  }

  function wireMobileToggle() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  function wireLangSwitcher() {
    const btn = document.getElementById('langToggle');
    const menu = document.getElementById('langMenu');
    const current = document.getElementById('langCurrent');
    if (!btn || !menu || !current) return;

    const saved = localStorage.getItem('pouHonoLang') || 'en';
    current.textContent = LANG_LABELS[saved] || LANG_LABELS.en;
    if (saved !== 'en' && typeof window.applyTranslations === 'function') {
      window.applyTranslations(saved);
    }

    btn.addEventListener('click', () => {
      const opening = menu.hasAttribute('hidden');
      if (opening) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', String(opening));
    });

    menu.querySelectorAll('[data-lang]').forEach((item) => {
      item.addEventListener('click', () => {
        const lang = item.getAttribute('data-lang');
        localStorage.setItem('pouHonoLang', lang);
        current.textContent = LANG_LABELS[lang] || LANG_LABELS.en;
        menu.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
        if (typeof window.applyTranslations === 'function') {
          window.applyTranslations(lang);
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && !btn.contains(event.target)) {
        menu.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function setFooterYear() {
    const el = document.getElementById('footerYear');
    if (el) el.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSite);
  } else {
    injectSite();
  }
})();
