(() => {
  document.documentElement.classList.add('js');
  const trackedParameters = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'campaign_id', 'adset_id', 'ad_id', 'placement', 'site_source_name',
    'fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid', 'msclkid', 'li_fat_id'
  ];
  const params = new URLSearchParams(window.location.search);
  const attribution = {};
  trackedParameters.forEach((key) => {
    const value = params.get(key);
    if (value) attribution[key] = value;
  });

  window.advanxLandingEvents = window.advanxLandingEvents || [];
  const emit = (event, extra = {}) => {
    window.advanxLandingEvents.push({
      event,
      page: 'advanx-ia-advogados-14-dias',
      timestamp: new Date().toISOString(),
      attribution,
      ...extra
    });
  };

  emit('page_view');
  document.querySelectorAll('[data-whatsapp-cta]').forEach((link) => {
    link.addEventListener('click', () => emit('contact_click', { destination: link.href }));
  });

  document.querySelectorAll('.reveal').forEach((element) => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.classList.add('is-visible');
    }
  });

  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();

// Formulário de captura: grava no banco (edge function receber-lead) e no CRM (webhook DeskComm), depois leva ao WhatsApp.
var DDDS_BR='11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' ');function celularBR(v){var d=String(v==null?'':v).split('@')[0].replace(/\D/g,'');if(d.length===13&&d.slice(0,2)==='55')d=d.slice(2);if(d.length===12&&d.charAt(0)==='0')d=d.slice(1);return /^[1-9]{2}9\d{8}$/.test(d)&&DDDS_BR.indexOf(d.slice(0,2))!==-1&&!/^(\d)\1+$/.test(d.slice(2))?'55'+d:''}function digitosCelular(v){var d=String(v==null?'':v).replace(/\D/g,'');if(d.length>11&&d.slice(0,2)==='55')d=d.slice(2);if(d.length>11&&d.charAt(0)==='0')d=d.slice(1);return d.slice(0,11)}function mascaraCelular(v){var d=digitosCelular(v);if(!d)return'';if(d.length<3)return'('+d;var p='('+d.slice(0,2)+') ';if(d.length<=7)return p+d.slice(2);return p+d.slice(2,7)+'-'+d.slice(7)}
(() => {
  const form = document.getElementById('leadForm');
  if (!form) return;
  const LEAD_ENDPOINT = 'https://rbhdpchaawbclzjcwkoe.supabase.co/functions/v1/receber-lead';
  const CRM_WEBHOOK = 'https://crm.advanx.com.br/api/v1/webhooks/in/PYIzThgZND55Ocx-FpHS_wAmUueRs_sX';
  const $ = (id) => document.getElementById(id);
  const phone = $('lf-telefone');
  phone.addEventListener('input', () => {
    phone.value = mascaraCelular(phone.value);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = $('lf-nome').value.trim();
    const telefone = celularBR(phone.value);
    const email = $('lf-email').value.trim();
    const status = $('lf-status');
    $('lf-nome').setAttribute('aria-invalid', String(nome.length < 2));
    phone.setAttribute('aria-invalid', String(!telefone));
    if (nome.length < 2 || !telefone) {
      status.className = 'form-status error';
      status.textContent = 'Preencha seu nome e um WhatsApp com DDD.';
      return;
    }
    const btn = $('lf-btn');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    status.className = 'form-status';
    status.textContent = '';
    const utm = new URLSearchParams(window.location.search);
    const g = (k) => utm.get(k) || null;
    const lead = {
      formulario: 'LP Advanx IA 14 dias', nome, telefone, email,
      utm_source: g('utm_source'), utm_medium: g('utm_medium'), utm_campaign: g('utm_campaign'), utm_content: g('utm_content'), utm_term: g('utm_term'),
      fbclid: g('fbclid'), gclid: g('gclid'), respostas: { pagina: location.pathname },
    };
    // Os dois envios rodam juntos; falha em um não impede o outro nem a ida ao WhatsApp.
    await Promise.race([new Promise((r) => setTimeout(r, 1500)), Promise.allSettled([
      fetch(LEAD_ENDPOINT, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead), signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined }),
      fetch(CRM_WEBHOOK, { method: 'POST', mode: 'no-cors', keepalive: true, body: new URLSearchParams({ nome, telefone: telefone.slice(2), email }) }),
    ])]);
    (window.dataLayer = window.dataLayer || []).push({ event: 'generate_lead', form_name: 'LP Advanx IA 14 dias' });
    (window.advanxLandingEvents = window.advanxLandingEvents || []).push({ event: 'lead_submit', page: 'advanx-ia-advogados-14-dias', timestamp: new Date().toISOString() });
    const texto = `Olá, sou ${nome}. Acabei de me cadastrar e quero começar o teste de 14 dias da Advanx IA.`;
    window.location.href = `https://wa.advanx.com.br/r?text=${encodeURIComponent(texto)}`;
  });
})();
