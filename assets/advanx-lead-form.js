/* Shared lead capture for Advanx local-service LPs. */
(function () {
  'use strict';

  var ENDPOINT = 'https://wa.advanx.com.br/lead';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'msclkid', 'li_fat_id'];

  function compact(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function formatPhone(value) {
    var digits = String(value || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
    if (digits.length <= 11) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, digits.length - 4) + '-' + digits.slice(-4);
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7, 11);
  }

  function submissionId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  function attribution() {
    var query = new URLSearchParams(window.location.search);
    var values = {};
    UTM_KEYS.forEach(function (key) {
      var value = compact(query.get(key));
      if (value) values[key] = value.slice(0, 300);
    });
    return values;
  }

  function setStatus(node, message, error) {
    node.textContent = message;
    node.hidden = !message;
    node.classList.toggle('is-error', Boolean(error));
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-advanx-lead-form]').forEach(function (form) {
      var phone = form.querySelector('[name="telefone"]');
      var status = form.querySelector('[data-form-status]');
      var submit = form.querySelector('[type="submit"]');
      var source = form.getAttribute('data-source');

      if (phone) {
        phone.addEventListener('input', function () {
          phone.value = formatPhone(phone.value);
        });
      }

      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        if (!source) {
          setStatus(status, 'Não foi possível iniciar o envio. Atualize a página e tente novamente.', true);
          return;
        }

        submit.disabled = true;
        submit.setAttribute('aria-busy', 'true');
        setStatus(status, 'Registrando seus dados…', false);

        var data = new FormData(form);
        var payload = {
          submission_id: submissionId(),
          nome: compact(data.get('nome')),
          telefone: compact(data.get('telefone')),
          email: compact(data.get('email')).toLowerCase(),
          instagram: compact(data.get('instagram')),
          faturamento: compact(data.get('faturamento')),
          source: source,
          path: window.location.pathname,
          attribution: attribution()
        };

        try {
          var response = await fetch(ENDPOINT, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
          });
          var result = await response.json().catch(function () { return {}; });
          if (!response.ok || !result.redirect_url) throw new Error(result.error || 'Falha ao registrar o lead');

          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: 'generate_lead',
            page_type: 'local_service',
            page_slug: source,
            lead_source: payload.attribution.utm_source || 'organico',
            lead_medium: payload.attribution.utm_medium || 'organico'
          });
          window.location.assign(result.redirect_url);
        } catch (error) {
          setStatus(status, 'Não foi possível registrar seus dados agora. Revise as informações e tente novamente.', true);
          submit.disabled = false;
          submit.removeAttribute('aria-busy');
        }
      });
    });
  });
}());
