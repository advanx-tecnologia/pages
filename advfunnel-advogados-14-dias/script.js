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
      page: 'advfunnel-advogados-14-dias',
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
