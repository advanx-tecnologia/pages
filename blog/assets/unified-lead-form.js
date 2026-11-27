/* Formulário comercial único do Blog Advanx.
   Centraliza captação, atribuição do artigo/UTM, aviso comercial e redirect ao WhatsApp oficial. */
(function () {
  'use strict';

  var RECEIVER_ENDPOINT = 'https://form.advanx.com.br/api/blog-leads'; // Worker na Cloudflare (o apex é GitHub Pages), recibo persistente no servidor

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
  var UTM_STORAGE_KEY = 'advanx_blog_attribution_v1';
  var ACCESS_STORAGE_KEY = 'advanx_blog_article_session_access_v2';
  var PENDING_STORAGE_KEY = 'advanx_blog_pending_leads_v1';
  // Textos aprovados (form-textos.md, Sarabi, 20/11). Entrega sem área do negócio (Rafael, 27/11).
  var WHATSAPP_OFICIAL = '5571981897865'; // API oficial (pedido do Rafael, 20/11)
  var OPT_IN_TEXTO ='Quer receber um diagnóstico de onde aplicar IA no seu negócio, com garantia?';
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

  // Página de entrega (tutorial de material prometido em post): <meta name="advanx:entrega" content="URL do material">.
  function entregaMaterial() {
    var meta = document.querySelector('meta[name="advanx:entrega"]');
    return meta ? cleanText(meta.getAttribute('content'), 300) : '';
  }

  function configureForm() {
    var overlay = document.getElementById('auf-overlay');
    var entrega = gateActive && !!entregaMaterial();
    overlay.querySelector('h2').textContent = entrega ? 'Falta um passo para ver o tutorial' : gateActive ? 'Conteúdo gratuito' : 'Fale com um Especialista Advanx';
    overlay.querySelector('.auf-sub').textContent = entrega ? 'Com o seu contato, o passo a passo abre aqui mesmo, nesta página.' : gateActive ? 'Preencha para continuar pelo WhatsApp.' : 'Preencha para conversar com nossa equipe.';
    overlay.querySelector('.auf-note').textContent = entrega ? '' : gateActive ? 'Após preencher, você será direcionado ao WhatsApp. Sem spam. Sem custos.' : '';
    // Opt-in só na entrega: desmarcado por padrão, não obrigatório (LGPD: consentimento livre).
    overlay.querySelector('.auf-optin').hidden = !entrega;
    overlay.classList.toggle('article-gate', gateActive);
    overlay.querySelector('.auf-close').hidden = gateActive;
    var pedeEspecialidade = gateActive && !entrega; // entrega pede só nome, WhatsApp e e-mail
    overlay.querySelector('.auf-specialty').hidden = !pedeEspecialidade;
    overlay.querySelector('#auf-specialty').required = pedeEspecialidade;
    overlay.querySelector('#auf-other').required = pedeEspecialidade && overlay.querySelector('#auf-specialty').value === 'Outro';
    overlay.querySelector('.auf-other').hidden = !overlay.querySelector('#auf-other').required;
    overlay.querySelector('#auf-submit').textContent = submitLabel();
  }

  function submitLabel() {
    return gateActive ? (entregaMaterial() ? 'Quero ver o tutorial' : 'Continuar no WhatsApp') : 'Quero conhecer as soluções →';
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

  // Depois do formulário (fora da página de entrega): WhatsApp da API oficial, com as respostas na mensagem.
  // O botão flutuante sem formulário (leadName vazio) usa o mesmo número.
  function commercialUrl(leadName, answer) {
    var url = new URL('https://wa.me/' + WHATSAPP_OFICIAL);
    var lines = ['Olá! ' + (leadName ? 'Sou ' + leadName + '. ' : '') + 'Vim pelo artigo "' + currentArticle().title + '" do blog da Advanx.'];
    if (answer) lines.push('Especialidade: ' + answer);
    lines.push('Quero conhecer as soluções.');
    url.searchParams.set('text', lines.join('\n'));
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
      '#auf-overlay [hidden]{display:none!important}.auf-specialty,.auf-other,.auf-optin{grid-column:1/-1}.auf-optin{display:flex;gap:10px;align-items:flex-start;min-height:44px;color:var(--text-soft);font-size:.9rem;line-height:1.4;cursor:pointer}.auf-optin input{width:20px;height:20px;margin:1px 0 0;flex:none}.article-gate .auf-note{color:var(--focus)}.auf-field [aria-invalid="true"]{border-color:var(--danger)}' +
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
      '<label class="auf-optin" hidden><input id="auf-optin" type="checkbox"> <span>' + OPT_IN_TEXTO + '</span></label>' +
      '<div class="auf-field auf-specialty" hidden><select id="auf-specialty" aria-label="Especialidade obrigatória"><option value="">Selecione sua especialidade</option><option>Cível</option><option>Trabalhista</option><option>Previdenciário</option><option>Família e Sucessões</option><option>Empresarial</option><option>Penal</option><option>Tributário</option><option>Consumidor</option><option>Outro</option></select></div>' +
      '<div class="auf-field auf-other" hidden><input id="auf-other" type="text" maxlength="120" placeholder="Informe sua especialidade" aria-label="Qual especialidade? Obrigatório"></div>' +
      '</div><div id="auf-error" class="auf-error" role="alert" tabindex="-1"></div><button id="auf-submit" class="auf-submit" type="submit">Quero conhecer as soluções →</button>' +
      '</form></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.auf-close').addEventListener('click', closeForm);
    overlay.addEventListener('click', function (event) { if (event.target === overlay) closeForm(); });
    overlay.querySelector('#auf-phone').addEventListener('input', function (event) {
      var digits = this.value.replace(/\D/g, '');
      // Digitando "+55..." tecla por tecla: fica sem máscara até ter DDI + DDD + 9 dígitos (13).
      if (/^\s*\+/.test(this.value) && digits.length < 13) {
        this.value = '+' + digits;
        this.dataset.prev = '';
        this.setCustomValidity(isMobile(normalizePhone(digits)) ? '' : 'Confira o celular com DDD. Ex.: (11) 91234-5678');
        return;
      }
      // Autopreenchimento e sugestão do teclado ("+55 71 91234-5678", "071...") chegam por input: normaliza aqui.
      // Digitar além de um número completo não troca o que já está certo.
      // Digitação incremental de "0DD...": não normalizar com ≤2 dígitos (o 0 sumiria antes de o DDD aparecer).
      var typing = event && event.inputType === 'insertText';
      var v = typing && digits.length > 11 && this.dataset.prev
        ? this.dataset.prev
        : typing && digits.length <= 2 && digits.charAt(0) === '0'
          ? digits
          : normalizePhone(this.value);
      this.dataset.prev = v;
      if (v.length > 7) v = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
      else if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
      else if (v) v = '(' + v;
      this.value = v;
      // Só celular: DDD + 9 + 8 dígitos.
      this.setCustomValidity(v && !isMobile(this.value.replace(/\D/g, '')) ? 'Confira o celular com DDD. Ex.: (11) 91234-5678' : '');
    });
    // Colar "+55 71 99999-9999" ou "071 99999-9999": troca o campo inteiro pelo número colado.
    overlay.querySelector('#auf-phone').addEventListener('paste', function (event) {
      var text = (event.clipboardData || window.clipboardData).getData('text') || '';
      event.preventDefault();
      this.value = normalizePhone(text);
      this.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Folga para "+55 (71) 91234-5678" chegar inteiro; o handler de input limita a 11 dígitos.
    overlay.querySelector('#auf-phone').setAttribute('maxlength', '24');
    overlay.querySelector('#auf-phone').setAttribute('inputmode', 'numeric');
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
    // Reaberto depois de liberar o tutorial (gateActive false): volta aos textos padrão, sem opt-in.
    configureForm();
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

  function isMobile(phone) {
    return '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' ').indexOf(phone.slice(0, 2)) !== -1 && /^[1-9]{2}9\d{8}$/.test(phone) && !/^(\d)\1+$/.test(phone.slice(2));
  }

  // Só dígitos; tira +55 e o 0 de longa distância. Fica com no máximo 11 dígitos.
  function normalizePhone(text) {
    var d = String(text || '').replace(/\D/g, '');
    if (d.length >= 12 && d.slice(0, 2) === '55') d = d.slice(2);
    if (d.charAt(0) === '0') d = d.slice(1);
    return d.slice(0, 11);
  }

  // Lead atual deste formulário: "tentar de novo" reusa o mesmo submission_id.
  var currentJob = null;

  // Campos que vão ao CRM (Deskcomm). A entrada "Blog" guarda chaves extras em custom_fields e utm_* em
  // source_metadata, mesmo com field_map e form_fields vazios (teste de 20/11).
  function crmFields(lead, article, utm, extra) {
    var f = { nome: lead.nome, telefone: "55" + lead.telefone, email: lead.email, submission_id: lead.submission_id,
      artigo_slug: article.slug, artigo_url: article.url, artigo_titulo: article.title };
    UTM_KEYS.forEach(function (key) { if (utm[key]) f[key] = utm[key]; });
    if (extra.especialidade) f.especialidade = extra.especialidade;
    if (extra.entregavel) {
      f.origem_lead = 'entrega';
      f.entregavel = extra.entregavel;
      f.opt_in_contato = extra.opt_in ? 'sim' : 'nao';
      // O link da DM leva utm_medium=dm-openreply, utm_content=<palavra> e utm_term=<código do post>.
      if (utm.utm_medium === 'dm-openreply') {
        if (utm.utm_content) f.palavra_chave = utm.utm_content;
        if (utm.utm_term) f.post_instagram = utm.utm_term;
      }
    }
    return f;
  }

  // O servidor deduplica pelo mesmo submission_id. Aceite202 não significa entrega no CRM.
  // POST repetido recupera o recibo; após receipt conhecido usamos apenas GET.
  function savePending(job) {
    var id = job.supabase.submission_id;
    pending(function (list) { return list.map(function (j) { return j.supabase.submission_id === id ? job : j; }); });
  }
  function sendLead(job) {
    var id = job.supabase.submission_id;
    var receipt = job.receipt;
    return fetch(RECEIVER_ENDPOINT + (receipt ? '/' + encodeURIComponent(id) : ''), {
      method: receipt ? 'GET' : 'POST', keepalive: true,
      headers: receipt ? undefined : { 'Content-Type': 'text/plain;charset=UTF-8' }, // envio simples, sem pré-checagem CORS
      body: receipt ? undefined : JSON.stringify({ crm: job.crm, supabase: job.supabase })
    }).then(function (r) {
      // 409/422: o servidor nunca vai aceitar este pacote; não insistir a cada página.
      if (r.status === 409 || r.status === 422) tirarDaFila(job);
      if (!r.ok) throw new Error('receiver ' + r.status);
      return r.json();
    }).then(function (r) {
      if (r.submission_id !== id || r.accepted !== true || typeof r.receipt !== 'string' ||
          (receipt && receipt !== r.receipt)) throw new Error('recibo inválido');
      job.receipt = r.receipt;
      job.destinations = r.destinations;
      savePending(job);
      // Sai da fila só quando o servidor CONFIRMOU o CRM por leitura (ou desistiu e guardou para conciliação).
      // Supabase/aviso são do servidor: o navegador nunca reenvia nada depois do recibo, só consulta (GET).
      var crm = r.destinations && r.destinations.crm;
      if (crm !== 'delivered' && crm !== 'failed') throw new Error('CRM ainda não confirmado');
    });
  }

  function tirarDaFila(job) {
    var id = job.supabase.submission_id;
    pending(function (l) { return l.filter(function (j) { return j.supabase.submission_id !== id; }); });
  }

  // Lead que não confirmou fica guardado neste navegador e é reenviado na próxima página (mesmo submission_id).
  function pending(update) {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(PENDING_STORAGE_KEY) || '[]'); } catch (_) {}
    list = update(list).slice(-5);
    try { localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
  }

  var PENDING_MAX_AGE = 7 * 24 * 3600 * 1000; // mesma janela de conferência do servidor
  function retryPending() {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(PENDING_STORAGE_KEY) || '[]'); } catch (_) {}
    var now = Date.now();
    list.forEach(function (job) {
      if (job.created && now - job.created > PENDING_MAX_AGE) { tirarDaFila(job); return; }
      sendLead(job).then(function () { tirarDaFila(job); }).catch(function () {});
    });
  }

  // A MESMA regra do receptor (lead_receiver.EMAIL_RE): e-mail que passa aqui não leva 422 lá.
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function submitLead(event) {
    event.preventDefault();
    var name = cleanText(document.getElementById('auf-name').value, 120);
    var phone = normalizePhone(document.getElementById('auf-phone').value);
    var email = cleanText(document.getElementById('auf-email').value, 180).toLowerCase();
    var error = document.getElementById('auf-error');
    var button = document.getElementById('auf-submit');
    if (button.disabled) return;
    var entregavel = gateActive ? entregaMaterial() : '';
    var pedeEspecialidade = gateActive && !entregavel;
    var specialty = pedeEspecialidade ? cleanText(document.getElementById('auf-specialty').value, 120) : '';
    if (specialty === 'Outro') specialty = cleanText(document.getElementById('auf-other').value, 120);
    if (name.length < 2 || !isMobile(phone) || !EMAIL_RE.test(email) || (pedeEspecialidade && !specialty)) {
      error.textContent = !isMobile(phone) && phone ? 'Confira o celular com DDD. Ex.: (11) 91234-5678'
        : entregavel ? 'Confira nome, WhatsApp e e-mail.'
        : gateActive ? 'Preencha nome, WhatsApp, e-mail e especialidade válidos.' : 'Preencha nome, WhatsApp e e-mail válidos.';
      error.style.display = 'block';
      return;
    }
    error.style.display = 'none';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Registrando...';

    var article = currentArticle();
    var utm = attribution();
    var optIn = !!entregavel && document.getElementById('auf-optin').checked;
    var extra = entregavel ? { entregavel: entregavel, opt_in: optIn } : { especialidade: specialty };
    // Após reload/timeout, o mesmo formulário reaproveita a intenção pendente; nunca cria outro id às cegas.
    var reusable = null;
    try {
      var previousJobs = JSON.parse(localStorage.getItem(PENDING_STORAGE_KEY) || '[]');
      reusable = previousJobs.find(function (j) {
        var c = j.crm || {};
        return c.nome === name && c.email === email && c.telefone === '55' + phone &&
          // Entrega ignora a área: um pendente antigo com área ainda é o mesmo lead (sem duplicar).
          c.artigo_url === article.url && (!pedeEspecialidade || (c.especialidade || '') === specialty) &&
          (c.entregavel || '') === entregavel && (!entregavel || c.opt_in_contato === (optIn ? 'sim' : 'nao'));
      }) || null;
    } catch (_) {}
    var submissionId = reusable ? reusable.supabase.submission_id
      : (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    var crm = crmFields({ nome: name, telefone: phone, email: email, submission_id: submissionId }, article, utm, extra);
    var job = {
      supabase: {
        nome: name,
        telefone: phone,
        email: email,
        kanban_stage: 'Novo Lead',
        pipeline_type: 'inbound',
        funil_lead: 'Blog Advanx - Formulário único', // mesma entrada para entrega (decisão do Rafael, 20/11)
        empresa_fonte: 'Advanx',
        origem: utm.utm_source || 'blog',
        campanha: utm.utm_campaign || article.slug,
        conjunto: utm.utm_medium || 'organico',
        anuncio: utm.utm_content || article.title,
        posicionamento: utm.utm_term || article.url,
        utm_medium: utm.utm_medium || null,
        submission_id: submissionId,
        // Existing CRM schema has no especialidade column; retain the answer in its documented comment field.
        comentario: 'Artigo de origem: ' + article.title + ' | URL: ' + article.url +
          (entregavel ? ' | Entregável: ' + entregavel + ' | Opt-in contato IA: ' + (optIn ? 'sim' : 'não') :(specialty ? ' | Especialidade: ' + specialty : '')) +
          (utm.fbclid ? ' | fbclid: ' + utm.fbclid : '') + (utm.gclid ? ' | gclid: ' + utm.gclid : '')
      },
      crm: crm,
      created: Date.now()
    }; // o aviso interno é montado no servidor

    if (reusable) {
      job = reusable;
      specialty = job.crm.especialidade || specialty;
    }
    currentJob = job;
    // Guarda antes de enviar: se a página fechar ou o envio falhar, o lead sai na próxima visita.
    pending(function (l) { return l.filter(function (j) { return j.supabase.submission_id !== submissionId; }).concat([job]); });
    var sent = sendLead(job).then(function () {
      tirarDaFila(job);
      if (currentJob === job) currentJob = null;
      return true;
    }, function () { return false; });
    // Avança imediatamente; confirmação e reenvio seguem por trás.
    // Mesmo com falha, segue para o WhatsApp; destinos pendentes ficam na fila.
    // Mantém a identidade da tentativa até o recibo confirmar entrega.

    try {
      if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { content_name: article.title, content_category: 'Blog Advanx' });
      if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { event_category: entregavel ? 'blog_entrega' : 'blog_unified_form', article_slug: article.slug });
    } catch (_) { /* Analytics failure must not invalidate the saved submission. */ }

    if (gateActive) {
      rememberArticleAccess();
      gateActive = false;
    }
    if (entregavel) {
      // Página de entrega: libera o tutorial aqui mesmo, sem mandar ao WhatsApp.
      closeForm();
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = submitLabel();
      return;
    }
    location.href = commercialUrl(name, specialty);
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
    retryPending();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
