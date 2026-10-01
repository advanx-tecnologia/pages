/* Formulário comercial único do Blog Advanx.
   Centraliza captação, atribuição do artigo/UTM, aviso comercial e redirect ao WhatsApp oficial. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://lhbwfbquxkutcyqazpnw.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYndmYnF1eGt1dGN5cWF6cG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1Mjc5MTksImV4cCI6MjA2NjEwMzkxOX0.Tk6O2kpzTWcce9laIancu-lMFATLYkaTvgLBiRMsa10';
  var LEAD_ENDPOINT = SUPABASE_URL + '/rest/v1/dados_cliente';
  var NOTIFICATION_ENDPOINT = 'https://n8n.advfunnel.com.br/webhook/lead-funil-41d-comercial-efc4f106bbae40dcb0f4a2fc7bebe72c';
  var CRM_ENDPOINT = 'https://crm.advanx.com.br/api/v1/webhooks/in/F40oWYZi8ZbIU6fns-xwDmtHF6o5rLCY';

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  var UTM_STORAGE_KEY = 'advanx_blog_attribution_v1';
  var ACCESS_STORAGE_KEY = 'advanx_blog_article_session_access_v2';
  var gateActive = false;
  var previousFocus = null;
  var previousOverflow = '';
  var inertElements = [];

  function hasArticleAccess() {
    try {
      var entries = JSON.parse(sessionStorage.getItem(ACCESS_STORAGE_KEY) || '{}');
      return entries[currentArticle().url] === true;
    } catch (_) { return false; }
  }

  function rememberArticleAccess() {
    try {
      var entries = JSON.parse(sessionStorage.getItem(ACCESS_STORAGE_KEY) || '{}');
      entries[currentArticle().url] = true;
      sessionStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(entries));
    } catch (_) { /* The successful submission still releases this page when storage is unavailable. */ }
  }

  function configureForm() {
    var overlay = document.getElementById('auf-overlay');
    overlay.querySelector('h2').textContent = gateActive ? 'Conteúdo gratuito' : 'Fale com um Especialista Advanx';
    overlay.querySelector('.auf-sub').textContent = gateActive ? 'Preencha para continuar pelo WhatsApp.' : 'Preencha para conversar com nossa equipe.';
    overlay.querySelector('.auf-note').textContent = gateActive ? 'Após preencher, você será direcionado ao WhatsApp. Sem spam. Sem custos.' : '';
    overlay.classList.toggle('article-gate', gateActive);
    overlay.querySelector('.auf-close').hidden = gateActive;
    overlay.querySelector('.auf-specialty').hidden = !gateActive;
    overlay.querySelector('#auf-specialty').required = gateActive;
    overlay.querySelector('#auf-other').required = gateActive && overlay.querySelector('#auf-specialty').value === 'Outro';
    overlay.querySelector('.auf-other').hidden = !overlay.querySelector('#auf-other').required;
    overlay.querySelector('#auf-submit').textContent = gateActive ? 'Continuar no WhatsApp' : 'Quero conhecer as soluções →';
  }

  function installArticleGate() {
    if (!isArticle() || !isTouchReader() || /bot|crawler|spider|lighthouse/i.test(navigator.userAgent) || hasArticleAccess()) return;
    gateActive = true;
    configureForm();
    openForm();
  }

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
      (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 1280);
  }

  function commercialUrl(leadName) {
    var url = new URL('https://wa.advanx.com.br/r');
    url.searchParams.set('text', 'Olá, ' + (leadName ? 'sou ' + leadName + ' e ' : '') + 'vim do blog ' + currentArticle().title + '. Preciso automatizar ou de atendimento.');
    var utm = attribution();
    UTM_KEYS.forEach(function (key) { if (utm[key]) url.searchParams.set(key, utm[key]); });
    return url.href;
  }

  function installDesktopWhatsApp() {
    if (!isArticle() || isTouchReader()) return;
    var button = document.createElement('a');
    button.id = 'auf-whatsapp';
    button.href = commercialUrl();
    button.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true" focusable="false"><path d="M20.52 3.48A11.89 11.89 0 0 0 12.05 0C5.46 0 .1 5.36.1 11.95c0 2.11.55 4.17 1.6 5.98L0 24l6.24-1.64a11.94 11.94 0 0 0 5.8 1.48h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.19-1.24-6.18-3.48-8.41ZM12.05 21.82h-.01a9.91 9.91 0 0 1-5.05-1.38l-.36-.21-3.7.97.99-3.61-.24-.37a9.89 9.89 0 0 1-1.51-5.27c0-5.48 4.46-9.94 9.94-9.94a9.88 9.88 0 0 1 7.03 2.91 9.88 9.88 0 0 1 2.9 7.04c0 5.48-4.46 9.94-9.99 9.94Zm5.45-7.44c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.71.22 1.35.19 1.86.11.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/></svg>';
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
    return '<div class="auf-field">' +
      '<input id="' + id + '" type="' + type + '" ' + (required ? 'required ' : '') +
      'placeholder="' + placeholder + '" aria-label="' + label + (required ? ' obrigatório' : '') + '" autocomplete="' + (type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'name') + '"></div>';
  }

  function installStyles() {
    var style = document.createElement('style');
    style.id = 'auf-styles';
    style.textContent =
      '#auf-overlay{display:none;position:fixed;inset:0;z-index:100000;background:rgba(13,13,18,.88);backdrop-filter:blur(10px);align-items:center;justify-content:center;padding:16px}' +
      '#auf-overlay.open{display:flex}.auf-box{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-xl);padding:32px;width:min(500px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;position:relative;box-shadow:0 30px 80px rgba(0,0,0,.35);font-family:var(--font-body)}' +
      '.auf-close{position:absolute;right:8px;top:8px;min-width:44px;min-height:44px;border:0;background:none;font-size:23px;color:var(--muted);cursor:pointer}.auf-box h2{font-family:var(--font-display);font-size:1.3rem;margin:0 32px 7px 0;color:var(--text)}.auf-sub{margin:0 0 20px;color:var(--text-soft);font-size:1rem;line-height:1.55}' +
      '.auf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.auf-field:first-child{grid-column:1/-1}' +
      '.auf-field input,.auf-field select{width:100%;padding:11px 13px;border:1.5px solid var(--input-border);border-radius:var(--radius-md);font:inherit;font-size:16px;color:var(--text);background:var(--input-bg);box-sizing:border-box}.auf-field input:focus,.auf-field select:focus{border-color:var(--focus)}' +
      '#auf-overlay [hidden]{display:none!important}.auf-specialty,.auf-other{grid-column:1/-1}.article-gate .auf-note{color:var(--focus)}.auf-field [aria-invalid="true"]{border-color:var(--danger)}' +
      '.auf-submit{width:100%;margin-top:14px;padding:14px;border:0;border-radius:var(--radius-md);background:var(--button-primary-bg);color:var(--button-primary-fg);font-weight:700;font-size:1rem;cursor:pointer}.auf-submit[disabled]{opacity:.65;cursor:wait}' +
      '.auf-note{text-align:left;color:var(--muted);font-size:.8rem;margin:0 0 20px;line-height:1.5}.auf-note:empty{display:none}.article-gate .auf-sub{margin-bottom:8px}.article-gate .auf-grid{grid-template-columns:1fr}.auf-error{display:none;margin-top:12px;padding:10px 12px;border:1px solid var(--danger);border-radius:var(--radius-sm);background:var(--surface-raised);color:var(--danger);font-size:.875rem}' +
      '.auf-inline{display:flex;justify-content:center;align-items:center;min-height:54px}.auf-open{border:0;border-radius:var(--radius-md);background:var(--button-primary-bg);color:var(--button-primary-fg);padding:13px 20px;font:600 16px var(--font-body);cursor:pointer}' +
      '#auf-whatsapp{position:fixed;right:24px;bottom:24px;z-index:9990;display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;padding:0;border:1px solid var(--line);border-radius:50%;background:var(--button-primary-bg);color:var(--button-primary-fg);text-decoration:none;box-shadow:0 8px 28px rgba(0,0,0,.25);animation:auf-whatsapp-pulse 2.6s ease-in-out infinite}#auf-whatsapp:hover{background:var(--button-primary-hover-bg)}@keyframes auf-whatsapp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}@media(prefers-reduced-motion:reduce){#auf-whatsapp{animation:none;transform:none}}' +
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
    overlay.setAttribute('aria-labelledby', 'auf-title');
    overlay.setAttribute('aria-describedby', 'auf-subtitle');
    overlay.innerHTML = '<div class="auf-box"><button class="auf-close" type="button" aria-label="Fechar">×</button>' +
      '<h2 id="auf-title">Fale com um Especialista Advanx</h2><p id="auf-subtitle" class="auf-sub">Preencha para conversar com nossa equipe.</p><p class="auf-note"></p>' +
      '<form id="auf-form"><div class="auf-grid">' +
      field('Nome completo', 'auf-name', 'text', true, 'Seu nome') +
      field('E-mail', 'auf-email', 'email', true, 'seu@email.com') +
      field('WhatsApp', 'auf-phone', 'tel', true, '(71) 99999-9999') +
      '<div class="auf-field auf-specialty" hidden><select id="auf-specialty" aria-label="Especialidade obrigatória"><option value="">Selecione sua especialidade</option><option>Cível</option><option>Trabalhista</option><option>Previdenciário</option><option>Família e Sucessões</option><option>Empresarial</option><option>Penal</option><option>Tributário</option><option>Consumidor</option><option>Outro</option></select></div>' +
      '<div class="auf-field auf-other" hidden><input id="auf-other" type="text" maxlength="120" placeholder="Informe sua especialidade" aria-label="Qual especialidade? Obrigatório"></div>' +
      '</div><div id="auf-error" class="auf-error" role="alert" tabindex="-1"></div><button id="auf-submit" class="auf-submit" type="submit">Quero conhecer as soluções →</button>' +
      '</form></div>';
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
    overlay.querySelector('#auf-specialty').addEventListener('change', function () {
      var other = gateActive && this.value === 'Outro';
      overlay.querySelector('.auf-other').hidden = !other;
      overlay.querySelector('#auf-other').required = other;
      if (other) overlay.querySelector('#auf-other').focus();
    });
    overlay.querySelectorAll('input,select').forEach(function (input) {
      input.addEventListener('blur', function () { this.setAttribute('aria-invalid', String(!this.checkValidity())); });
      input.addEventListener('input', function () { if (this.checkValidity()) this.removeAttribute('aria-invalid'); });
      input.addEventListener('invalid', function () { this.setAttribute('aria-invalid', 'true'); });
    });
    overlay.querySelector('#auf-form').addEventListener('submit', submitLead);
  }

  function openForm(event) {
    if (event) { event.preventDefault(); event.stopImmediatePropagation(); }
    var overlay = document.getElementById('auf-overlay');
    if (!overlay.classList.contains('open')) {
      previousFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      inertElements = Array.from(document.body.children).filter(function (element) { return element !== overlay && !element.inert; });
      inertElements.forEach(function (element) { element.inert = true; });
    }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { document.getElementById('auf-name').focus(); }, 30);
  }

  function closeForm() {
    if (gateActive) return;
    var overlay = document.getElementById('auf-overlay');
    if (!overlay || !overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    inertElements.forEach(function (element) { element.inert = false; });
    inertElements = [];
    document.body.style.overflow = previousOverflow;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
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
    if (button.disabled) return;
    var specialty = gateActive ? cleanText(document.getElementById('auf-specialty').value, 120) : '';
    if (specialty === 'Outro') specialty = cleanText(document.getElementById('auf-other').value, 120);
    if (name.length < 2 || !/^[1-9]{2}\d{8,9}$/.test(phone) || /^(\d)\1+$/.test(phone) || !/^\S+@\S+\.\S+$/.test(email) || (gateActive && !specialty)) {
      error.textContent = gateActive ? 'Preencha nome, WhatsApp, e-mail e especialidade válidos.' : 'Preencha nome, WhatsApp e e-mail válidos.';
      error.style.display = 'block';
      return;
    }
    error.style.display = 'none';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
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
      // Existing CRM schema has no especialidade column; retain the answer in its documented comment field.
      comentario: 'Artigo de origem: ' + article.title + ' | URL: ' + article.url + (specialty ? ' | Especialidade: ' + specialty : '') + (utm.fbclid ? ' | fbclid: ' + utm.fbclid : '')
    };

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Falha ao registrar o lead (' + response.status + ')');

      try {
        if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { content_name: article.title, content_category: 'Blog Advanx' });
        if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { event_category: 'blog_unified_form', article_slug: article.slug });
      } catch (_) { /* Analytics failure must not invalidate the saved submission. */ }

      var notification = 'Novo lead do Blog Advanx\n\nNome: ' + name + '\nWhatsApp: ' + phone + '\nE-mail: ' + email + '\nArtigo: ' + article.title + '\nURL: ' + article.url;
      fetch(NOTIFICATION_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem_formatada: notification }) }).catch(function () {});
      // CRM sem CORS: POST de formulário simples (no-cors); keepalive porque o redirect ao WhatsApp vem logo em seguida.
      fetch(CRM_ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true, body: new URLSearchParams({ nome: name, telefone: phone, email: email }) }).catch(function () {});

      if (gateActive) {
        rememberArticleAccess();
        gateActive = false;
      }
      location.href = commercialUrl(name);
    } catch (ex) {
      error.textContent = ex && ex.name === 'AbortError' ? 'O envio demorou demais. Verifique sua conexão e tente novamente.' : (ex && ex.message ? ex.message + '. Tente novamente.' : 'Não foi possível registrar seus dados. Tente novamente.');
      error.style.display = 'block';
      error.focus();
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = gateActive ? 'Continuar no WhatsApp' : 'Quero conhecer as soluções →';
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
    document.addEventListener('keydown', function (event) {
      var overlay = document.getElementById('auf-overlay');
      if (!overlay.classList.contains('open')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeForm(); }
      if (event.key === 'Tab') {
        var controls = Array.from(overlay.querySelectorAll('button,input,select,a[href]')).filter(function (element) { return !element.disabled && element.getClientRects().length; });
        var first = controls[0];
        var last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  function init() {
    attribution();
    installStyles();
    installModal();
    replaceOtherForms();
    bindUnifiedEntryPoints();
    installDesktopWhatsApp();
    installArticleGate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
