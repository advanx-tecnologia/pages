// Sumário único dos posts: gera "Neste artigo" a partir dos H2 do corpo (FAQ = 1 entrada),
// marca a seção ativa com aria-current e cria versão recolhível para telas < 1025px.
(function () {
  var body = document.querySelector('.art-body');
  var box = document.querySelector('.art-sidebar .sidebar-box');
  if (!body) return;

  var css = document.createElement('style');
  css.textContent =
    '.art-body{max-width:70ch}' +
    '.art-body h2,.art-body h3{scroll-margin-top:88px}' +
    '.art-sidebar{max-height:calc(100vh - 100px);overflow-y:auto}' +
    '.toc-nav{display:flex;flex-direction:column;gap:2px}' +
    '.toc-link.active{font-weight:600}' +
    '.toc-mobile{display:none;border:1px solid var(--border);border-radius:12px;padding:12px 16px;margin-bottom:2rem;background:var(--surface)}' +
    '.toc-mobile summary{cursor:pointer;font-weight:600;color:var(--ink)}' +
    '@media(max-width:1024px){.toc-mobile{display:block}}';
  document.head.appendChild(css);

  function slugify(t) {
    return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  }

  var heads = Array.prototype.filter.call(body.querySelectorAll('h2'), function (h) {
    return h.textContent.trim();
  });
  if (heads.length < 2) return;
  heads.forEach(function (h, i) {
    if (!h.id) h.id = slugify(h.textContent) || 'secao-' + (i + 1);
  });

  function buildNav() {
    var nav = document.createElement('nav');
    nav.className = 'toc-nav';
    nav.setAttribute('aria-label', 'Neste artigo');
    heads.forEach(function (h) {
      var a = document.createElement('a');
      a.className = 'toc-link';
      a.href = '#' + h.id;
      a.textContent = h.textContent.trim();
      nav.appendChild(a);
    });
    return nav;
  }

  if (box) {
    box.innerHTML = '<span class="sidebar-label">Neste artigo</span>';
    box.appendChild(buildNav());
  }
  var mobile = document.createElement('details');
  mobile.className = 'toc-mobile';
  mobile.innerHTML = '<summary>Neste artigo</summary>';
  mobile.appendChild(buildNav());
  body.insertBefore(mobile, body.firstChild);

  if (!('IntersectionObserver' in window)) return;
  var links = document.querySelectorAll('.toc-link');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + e.target.id;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-90px 0px -70% 0px' });
  heads.forEach(function (h) { io.observe(h); });
})();
