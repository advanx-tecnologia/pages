// Preserve attribution across the form subdomain; no personal information in analytics.
const keys=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','gbraid','wbraid'];
const params=new URLSearchParams(location.search);
for(const a of document.querySelectorAll('a[href^="https://form.advanx.com.br/implementacao-ia/"]')){const u=new URL(a.href);for(const k of keys)if(params.has(k))u.searchParams.set(k,params.get(k).slice(0,250));a.href=u.href;}
