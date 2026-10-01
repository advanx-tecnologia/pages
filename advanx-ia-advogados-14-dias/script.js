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

// Formulário de captura: grava no Supabase (dados_cliente) e no CRM (webhook DeskComm), depois leva ao WhatsApp.
(() => {
  const form = document.getElementById('leadForm');
  if (!form) return;
  const SU = 'https://lhbwfbquxkutcyqazpnw.supabase.co';
  // Chave anon pública (mesma do blog); RLS do Supabase controla o que ela pode fazer.
  const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYndmYnF1eGt1dGN5cWF6cG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1Mjc5MTksImV4cCI6MjA2NjEwMzkxOX0.Tk6O2kpzTWcce9laIancu-lMFATLYkaTvgLBiRMsa10';
  const CRM_WEBHOOK = 'https://crm.advanx.com.br/api/v1/webhooks/in/PYIzThgZND55Ocx-FpHS_wAmUueRs_sX';
  const $ = (id) => document.getElementById(id);
  const phone = $('lf-telefone');
  phone.addEventListener('input', () => {
    const v = phone.value.replace(/\D/g, '').slice(0, 11);
    phone.value = v.length > 6 ? `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}` : v.length > 2 ? `(${v.slice(0, 2)}) ${v.slice(2)}` : v;
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = $('lf-nome').value.trim();
    const telefone = phone.value.replace(/\D/g, '');
    const email = $('lf-email').value.trim();
    const status = $('lf-status');
    $('lf-nome').setAttribute('aria-invalid', String(nome.length < 2));
    phone.setAttribute('aria-invalid', String(telefone.length < 10));
    if (nome.length < 2 || telefone.length < 10) {
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
    const lead = {
      nome, telefone, email,
      kanban_stage: 'Novo Lead', pipeline_type: 'inbound', funil_lead: 'Advanx', empresa_fonte: 'Advanx',
      origem: utm.get('utm_source') || 'lp-advanx-ia-14-dias', campanha: utm.get('utm_campaign') || '',
      conjunto: utm.get('utm_medium') || '', anuncio: utm.get('utm_content') || '', posicionamento: utm.get('utm_term') || '',
    };
    // Os dois envios rodam juntos; falha em um não impede o outro nem a ida ao WhatsApp.
    await Promise.allSettled([
      fetch(`${SU}/rest/v1/dados_cliente`, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: SK, Authorization: `Bearer ${SK}`, Prefer: 'return=minimal' },
        body: JSON.stringify(lead),
      }),
      fetch(CRM_WEBHOOK, { method: 'POST', mode: 'no-cors', keepalive: true, body: new URLSearchParams({ nome, telefone, email }) }),
    ]);
    (window.dataLayer = window.dataLayer || []).push({ event: 'generate_lead', form_name: 'LP Advanx IA 14 dias' });
    (window.advanxLandingEvents = window.advanxLandingEvents || []).push({ event: 'lead_submit', page: 'advanx-ia-advogados-14-dias', timestamp: new Date().toISOString() });
    const texto = `Olá, sou ${nome}. Acabei de me cadastrar e quero começar o teste de 14 dias da Advanx IA.`;
    window.location.href = `https://wa.advanx.com.br/r?text=${encodeURIComponent(texto)}`;
  });
})();
