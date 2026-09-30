/* Formulário comercial único do Blog Advanx.
   Centraliza captação, atribuição do artigo/UTM, aviso comercial e redirect ao WhatsApp oficial. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://lhbwfbquxkutcyqazpnw.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYndmYnF1eGt1dGN5cWF6cG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1Mjc5MTksImV4cCI6MjA2NjEwMzkxOX0.Tk6O2kpzTWcce9laIancu-lMFATLYkaTvgLBiRMsa10';
  var LEAD_ENDPOINT = SUPABASE_URL + '/rest/v1/dados_cliente';
  var NOTIFICATION_ENDPOINT = 'https://n8n.advfunnel.com.br/webhook/lead-funil-41d-comercial-efc4f106bbae40dcb0f4a2fc7bebe72c';

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  var UTM_STORAGE_KEY = 'advanx_blog_attribution_v1';

  function cleanText(value, max) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max || 300);
  }

  function currentArticle() {
    var canonical = document.querySelector('link[rel="canonical"]');
    var h1 = document.querySelector('h1');
    var title = cleanText(h1 ? h1.textContent : document.title.replace(/\s*\|\s*Blog Advanx\s*$/i, ''), 180);
    var url = canonical && canonical.href ? canonical.href : location.origin + location.pathname;
    var slug = location.pathname.indexOf('/blog/') === 0
      ? location.pathname.split('/').filter(Boolean).pop()
      : 'pagina-inicial-blog';
    return { title: title || 'Blog Advanx', url: url, slug: slug };
  }

  function isArticle() {
    return /^\/blog\/[^/]+\/?$/.test(location.pathname) && !!document.querySelector('.art-body') &&
      !/^\/blog\/(categories|tags|guia|template)\/?$/.test(location.pathname);
  }

  function isTouchReader() {
    return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (navigator.maxTouchPoints > 0 && matchMedia('(any-pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 1280);
  }

  function commercialUrl() {
    var url = new URL('https://wa.advanx.com.br/r');
    url.searchParams.set('text', 'Olá, vim do blog ' + currentArticle().title + '. Preciso automatizar ou de atendimento.');
    var utm = attribution();
    UTM_KEYS.forEach(function (key) { if (utm[key]) url.searchParams.set(key, utm[key]); });
    return url.href;
  }

  function installDesktopWhatsApp() {
    if (!isArticle() || isTouchReader()) return;
    var button = document.createElement('a');
    button.id = 'auf-whatsapp';
    button.href = commercialUrl();
    button.textContent = 'WhatsApp comercial';
    button.setAttribute('aria-label', 'Conversar no WhatsApp comercial sobre este artigo');
    button.setAttribute('data-commercial-direct', 'true');
    document.body.appendChild(button);
  }

  function attribution() {
    var query = new URLSearchParams(location.search);
    var saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(UTM_STORAGE_KEY) || '{}'); } catch (_) {}
    UTM_KEYS.forEach(function (key) {
      var value = cleanText(query.get(key), 300);
      if (value) saved[key] = value;
    });
    try { sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(saved)); } catch (_) {}
    return saved;
  }

  function field(label, id, type, required, placeholder) {
    return '<label class="auf-field"><span>' + label + (required ? ' *' : '') + '</span>' +
      '<input id="' + id + '" type="' + type + '" ' + (required ? 'required ' : '') +
      'placeholder="' + placeholder + '" autocomplete="' + (type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'name') + '"></label>';
  }

  function installStyles() {
    var style = document.createElement('style');
    style.id = 'auf-styles';
    style.textContent =
      '#auf-overlay{display:none;position:fixed;inset:0;z-index:100000;background:rgba(13,13,18,.88);backdrop-filter:blur(10px);align-items:center;justify-content:center;padding:16px}' +
      '#auf-overlay.open{display:flex}.auf-box{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-xl);padding:32px;width:min(500px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;position:relative;box-shadow:0 30px 80px rgba(0,0,0,.35);font-family:var(--font-body)}' +
      '.auf-close{position:absolute;right:8px;top:8px;min-width:44px;min-height:44px;border:0;background:none;font-size:23px;color:var(--muted);cursor:pointer}.auf-box h2{font-family:var(--font-display);font-size:1.3rem;margin:0 32px 7px 0;color:var(--text)}.auf-sub{margin:0 0 20px;color:var(--text-soft);font-size:1rem;line-height:1.55}' +
      '.auf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.auf-field:first-child{grid-column:1/-1}.auf-field span{display:block;font-size:.875rem;font-weight:600;color:var(--text-soft);margin-bottom:5px}' +
      '.auf-field input{width:100%;padding:11px 13px;border:1.5px solid var(--input-border);border-radius:var(--radius-md);font:inherit;font-size:16px;color:var(--text);background:var(--input-bg);box-sizing:border-box}.auf-field input:focus{border-color:var(--focus)}' +
      '.auf-submit{width:100%;margin-top:14px;padding:14px;border:0;border-radius:var(--radius-md);background:var(--button-primary-bg);color:var(--button-primary-fg);font-weight:700;font-size:1rem;cursor:pointer}.auf-submit[disabled]{opacity:.65;cursor:wait}' +
      '.auf-note{text-align:center;color:var(--muted);font-size:.8rem;margin:9px 0 0}.auf-error{display:none;margin-top:12px;padding:10px 12px;border:1px solid var(--danger);border-radius:var(--radius-sm);background:var(--surface-raised);color:var(--danger);font-size:.875rem}' +
      '.auf-inline{display:flex;justify-content:center;align-items:center;min-height:54px}.auf-open{border:0;border-radius:var(--radius-md);background:var(--button-primary-bg);color:var(--button-primary-fg);padding:13px 20px;font:600 16px var(--font-body);cursor:pointer}' +
      '#auf-whatsapp{position:fixed;right:24px;bottom:24px;z-index:9990;display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 20px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--button-primary-bg);color:var(--button-primary-fg);font:600 16px var(--font-body);text-decoration:none;box-shadow:0 8px 28px rgba(0,0,0,.25)}#auf-whatsapp:hover{background:var(--button-primary-hover-bg)}' +
      '@media(max-width:560px){.auf-grid{grid-template-columns:1fr}.auf-field:first-child{grid-column:auto}.auf-box{padding:28px 20px}}';
    document.head.appendChild(style);
  }

  function installModal() {
    var old = document.getElementById('acm-overlay');
    if (old) old.remove();
    var overlay = document.createElement('div');
    overlay.id = 'auf-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Fale com um especialista Advanx');
    overlay.innerHTML = '<div class="auf-box"><button class="auf-close" type="button" aria-label="Fechar">×</button>' +
      '<h2>Fale com um Especialista Advanx</h2><p class="auf-sub">Preencha seus dados. Depois do registro, você continuará a conversa no WhatsApp oficial da Advanx IA.</p>' +
      '<form id="auf-form"><div class="auf-grid">' +
      field('Nome completo', 'auf-name', 'text', true, 'Seu nome') +
      field('WhatsApp', 'auf-phone', 'tel', true, '(71) 99999-9999') +
      field('E-mail', 'auf-email', 'email', true, 'seu@email.com') +
      '</div><div id="auf-error" class="auf-error"></div><button id="auf-submit" class="auf-submit" type="submit">Quero conhecer as soluções →</button>' +
      '<p class="auf-note">Seus dados serão registrados com a origem deste artigo e suas UTMs.</p></form></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.auf-close').addEventListener('click', closeForm);
    overlay.addEventListener('click', function (event) { if (event.target === overlay) closeForm(); });
    overlay.querySelector('#auf-phone').addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 7) v = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
      else if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
      else if (v) v = '(' + v;
      this.value = v;
    });
    overlay.querySelector('#auf-form').addEventListener('submit', submitLead);
  }

  function openForm(event) {
    if (event) { event.preventDefault(); event.stopImmediatePropagation(); }
    var overlay = document.getElementById('auf-overlay');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { document.getElementById('auf-name').focus(); }, 30);
  }

  function closeForm() {
    var overlay = document.getElementById('auf-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function replaceOtherForms() {
    document.querySelectorAll('form').forEach(function (form) {
      if (form.id === 'auf-form') return;
      var holder = document.createElement('div');
      holder.className = 'auf-inline';
      holder.innerHTML = '<button type="button" class="auf-open">Falar com um Especialista Advanx</button>';
      holder.querySelector('button').addEventListener('click', openForm);
      form.replaceWith(holder);
    });
  }

  async function submitLead(event) {
    event.preventDefault();
    var name = cleanText(document.getElementById('auf-name').value, 120);
    var phone = document.getElementById('auf-phone').value.replace(/\D/g, '').slice(0, 13);
    var email = cleanText(document.getElementById('auf-email').value, 180).toLowerCase();
    var error = document.getElementById('auf-error');
    var button = document.getElementById('auf-submit');
    if (!name || phone.length < 10 || !/^\S+@\S+\.\S+$/.test(email)) {
      error.textContent = 'Preencha nome, WhatsApp e e-mail válidos.';
      error.style.display = 'block';
      return;
    }
    error.style.display = 'none';
    button.disabled = true;
    button.textContent = 'Registrando...';

    var article = currentArticle();
    var utm = attribution();
    var submissionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    var payload = {
      nome: name,
      telefone: phone,
      email: email,
      kanban_stage: 'Novo Lead',
      pipeline_type: 'inbound',
      funil_lead: 'Blog Advanx - Formulário único',
      empresa_fonte: 'Advanx',
      origem: utm.utm_source || 'blog',
      campanha: utm.utm_campaign || article.slug,
      conjunto: utm.utm_medium || 'organico',
      anuncio: utm.utm_content || article.title,
      posicionamento: utm.utm_term || article.url,
      utm_medium: utm.utm_medium || null,
      submission_id: submissionId,
      comentario: 'Artigo de origem: ' + article.title + ' | URL: ' + article.url + (utm.fbclid ? ' | fbclid: ' + utm.fbclid : '')
    };

    try {
      var response = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Falha ao registrar o lead (' + response.status + ')');

      if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { content_name: article.title, content_category: 'Blog Advanx' });
      if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { event_category: 'blog_unified_form', article_slug: article.slug });

      var notification = 'Novo lead do Blog Advanx\n\nNome: ' + name + '\nWhatsApp: ' + phone + '\nE-mail: ' + email + '\nArtigo: ' + article.title + '\nURL: ' + article.url;
      fetch(NOTIFICATION_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem_formatada: notification }) }).catch(function () {});

      var message = 'Oi, me chamo ' + name + ', quero conhecer mais as soluções da Advanx IA, vim do artigo ' + article.title + ', pode me ajudar?';
      location.href = 'https://wa.advanx.com.br/r';
    } catch (ex) {
      error.textContent = ex && ex.message ? ex.message + '. Tente novamente.' : 'Não foi possível registrar seus dados. Tente novamente.';
      error.style.display = 'block';
      button.disabled = false;
      button.textContent = 'Quero conhecer as soluções →';
    }
  }

  function bindUnifiedEntryPoints() {
    window.acmOpen = openForm;
    document.addEventListener('click', function (event) {
      var target = event.target.closest('a,button');
      if (!target || target.hasAttribute('data-commercial-direct')) return;
      var href = target.getAttribute('href') || '';
      var onclick = target.getAttribute('onclick') || '';
      var text = cleanText(target.textContent, 100).toLowerCase();
      if (href.indexOf('wa.advanx.com.br/r') !== -1 || href.indexOf('api.whatsapp.com/') !== -1 || /acmOpen|openModal/.test(onclick) || text.indexOf('falar com especialista') !== -1) {
        openForm(event);
      }
    }, true);
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeForm(); });
  }

  function init() {
    attribution();
    installStyles();
    installModal();
    replaceOtherForms();
    bindUnifiedEntryPoints();
    installDesktopWhatsApp();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
