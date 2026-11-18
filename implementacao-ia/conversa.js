// Conversation integrated in the page (#conversa card in #diagnostico, visual v3). Same logic as the form route:
// one question at a time. The server validates and
// saves every answer; the browser holds no credentials and pushes only events without personal data to GTM.
import {questions, opening, next, path, validate, firstName} from './flow.js';

const API = document.querySelector('meta[name="ia-api"]')?.content || '/api/implementacao-ia/';
const WHATSAPP = 'https://wa.advanx.com.br/r';
const box = document.querySelector('#conversation');
const history = document.querySelector('#history');
const status = document.querySelector('#status');
const card = document.querySelector('#conversa');
const bar = el('div', undefined, 'conversa__barra');
bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-label', 'Andamento');
bar.append(el('i'));
document.querySelector('#conversa-fio').prepend(bar);
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Focus and scrolling only after the person starts the conversation, never on page load.
let interacted = false;
function reveal(target) {
  if (!interacted || !target) return;
  const r = card.getBoundingClientRect();
  if (r.top < 0 || r.top > innerHeight * 0.6) card.scrollIntoView({behavior: REDUCE ? 'auto' : 'smooth', block: 'start'});
  target.focus({preventScroll: true});
}
const ATTR = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'gbraid', 'wbraid'];
const attribution = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => ATTR.includes(k)).map(([k, v]) => [k, v.slice(0, 250)]));

// Microcopy v2 (Sarabi, 18/11).
const MSG = {
  empty: 'Falta só esse campo para seguir.',
  teams: 'Marque pelo menos uma opção para seguir.',
  phone: 'Esse número parece incompleto. Confira o DDD e os 9 dígitos.',
  email: 'Esse e-mail parece ter algum erro. Confira se tem o @ e o final, como .com.',
  instagram: 'Confira o @. Ele não pode ter espaço.',
  send: 'Não conseguimos salvar agora. Confira a sua internet e toque em Continuar de novo.',
  agenda: 'A agenda não abriu agora. A gente te chama no WhatsApp para marcar o horário.',
};

let token = sessionStorage.getItem('ia-session');
let state = {answers: {}};
let busy = false;

function track(event, extra = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event, form_name: 'implementacao_ia', ...extra});
}
function once(name, fn) {
  const key = 'ia-ev-' + name;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  fn();
}
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function icon(id) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  if (id === 'i-seta') { s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); }
  const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttribute('href', '#' + id);
  s.append(u);
  return s;
}
function bot(text) { const b = el('div', undefined, 'balao balao--bot'); for (const [i, part] of String(text).split('\n\n').entries()) { if (i) b.append(document.createElement('br'), document.createElement('br')); b.append(part); } return b; }
const say = (q, a) => typeof q.text === 'function' ? q.text(a) : q.text;
const first = firstName;
// (DD) 9XXXX-XXXX while typing; at most 11 digits; a pasted +55 is dropped.
// DDD 55 exists, so the country code is only dropped when the person starts with "+" (or pastes 13 digits).
function maskPhone(raw, intl = false) {
  let d = String(raw).replace(/\D/g, '');
  if (intl || String(raw).trim().startsWith('+')) { if (d.startsWith('55')) d = d.slice(2); else if (d === '5') d = ''; }
  else if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? '(' + d : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
// Optimistic flow: the next question shows at once; answers are saved in order behind it.
let confirmed = null;          // last state confirmed by the server
let chain = Promise.resolve(); // pending saves, in order
let generation = 0;            // bumps when a save fails, so the queued ones are dropped
const drafts = {};             // value to refill when a save fails

function friendly(key, value, serverMsg) {
  const blank = Array.isArray(value) ? !value.length : !String(value ?? '').trim();
  if (key === 'teams') return MSG.teams;
  if (blank) return MSG.empty;
  if (key === 'phone') return MSG.phone;
  if (key === 'email') return MSG.email;
  if (key === 'personal' || key === 'business') return MSG.instagram;
  return serverMsg || MSG.empty;
}

class SendError extends Error {}
async function api(route, payload) {
  let r;
  try {
    r = await fetch(API + route, {
      method: payload ? 'POST' : 'GET',
      headers: {...(payload ? {'Content-Type': 'application/json'} : {}), ...(token ? {Authorization: 'Bearer ' + token} : {})},
      ...(payload ? {body: JSON.stringify(payload)} : {}),
      signal: AbortSignal.timeout(30000),
    });
  } catch { throw new SendError(MSG.send); }
  let j = {};
  try { j = await r.json(); } catch { /* handled below */ }
  if (r.status === 401) { sessionStorage.removeItem('ia-session'); token = null; }
  if (r.status >= 500 || r.status === 429) throw new SendError(MSG.send);
  if (!r.ok || !j.ok) throw new Error(j.message || MSG.send);
  return j;
}

function progress() {
  const keys = path(state.answers);
  const done = keys.filter(k => k in state.answers).length;
  const end = ['calendar', 'end'].includes(state.next || next(state.answers));
  const pct = end ? 100 : Math.max(4, Math.round(done / keys.length * 100));
  bar.setAttribute('aria-valuenow', String(pct));
  bar.firstElementChild.style.width = pct + '%';
}

function showError(msg, field, where = status) {
  status.replaceChildren();
  box.querySelector('#erro')?.remove();
  const p = el('p', undefined, 'campo__erro');
  p.id = 'erro';
  p.setAttribute('role', 'alert');
  p.append(icon('i-alerta'), el('span', msg));
  where.append(p);
  if (field) { field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', 'erro'); field.focus(); }
}

// One state at a time (visual v3): the opening only before the first answer, then the last answer and the question.
function renderHistory() {
  const a = state.answers;
  const last = path(a).filter(k => k in a).at(-1);
  if (!last) { history.replaceChildren(bot(opening)); return; }
  const v = a[last];
  history.replaceChildren(el('div', last === 'phone' ? '+55 ' + v.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : Array.isArray(v) ? v.join(' · ') : v, 'balao balao--eu'));
}

function render() {
  box.replaceChildren();
  box.onsubmit = e => e.preventDefault();
  status.replaceChildren();
  renderHistory();
  progress();
  const key = state.next || next(state.answers);
  if (key === 'end') return finishWithoutProfile();
  if (key === 'calendar') return calendar();
  ask(key);
}

function splitOption(text) {
  const m = text.match(/^([^:(]+?)(?::\s*|\s*\()(.+?)\)?$/);
  return m && !text.startsWith('Ainda não sei') ? [m[1], m[2]] : [text, null];
}

function ask(key) {
  const q = questions[key];
  const label = bot(say(q, state.answers));
  label.id = 'pergunta';
  label.tabIndex = -1;
  history.append(label);
  let selected = Array.isArray(state.answers[key]) ? [...state.answers[key]] : [];
  let field;
  const isLast = path(state.answers).at(-1) === key && key === 'email';
  const button = el('button', isLast ? 'Ver horários ' : 'Continuar ', 'btn btn--primary btn--block');
  button.type = 'submit';
  button.append(icon('i-seta'));

  if (q.options) {
    const group = el('fieldset', undefined, q.multi ? 'opcoes opcoes--duas resposta' : 'opcoes resposta');
    group.setAttribute('aria-labelledby', 'pergunta');
    // Arrow keys only move the choice; Enter or Space confirms it (single choice has no button, as in the prototype).
    let viaArrow = false;
    group.onkeydown = e => {
      viaArrow = e.key.startsWith('Arrow');
      if (!q.multi && (e.key === 'Enter' || e.key === ' ') && selected.length) { e.preventDefault(); submit(); }
    };
    group.onpointerdown = () => { viaArrow = false; };
    for (const text of q.options) {
      const [title, small] = splitOption(text);
      const opt = el('label', undefined, q.multi ? 'opcao' : 'opcao opcao--radio');
      const input = el('input');
      input.type = q.multi ? 'checkbox' : 'radio';
      input.name = key;
      input.value = text;
      input.checked = selected.includes(text);
      const caixa = el('span', undefined, 'opcao__caixa');
      caixa.append(q.multi ? icon('i-check') : el('i'));
      const txt = el('span');
      txt.append(el('b', title));
      if (small) txt.append(el('small', small));
      opt.append(input, caixa, txt);
      input.onchange = () => {
        if (busy) return;
        if (q.multi) selected = [...group.querySelectorAll('input:checked')].map(i => i.value);
        else { selected = [text]; if (!viaArrow) submit(); }
      };
      group.append(opt);
    }
    box.append(group);
    if (q.multi) box.append(button);
  } else {
    field = el(q.type === 'textarea' ? 'textarea' : 'input', undefined, 'input');
    if (q.type !== 'textarea') field.type = q.type === 'email' ? 'email' : q.type === 'tel' ? 'tel' : 'text';
    field.placeholder = q.placeholder;
    field.setAttribute('aria-labelledby', 'pergunta');
    field.maxLength = key === 'pain' ? 2000 : key === 'phone' ? 20 : 200;
    if (drafts[key] !== undefined && !Array.isArray(drafts[key])) field.value = key === 'phone' ? maskPhone(drafts[key]) : drafts[key];
    if (q.autocomplete) field.autocomplete = q.autocomplete;
    let intl = false;
    if (key === 'phone') { field.inputMode = 'tel'; field.addEventListener('input', () => { const end = field.selectionStart === field.value.length; if (!field.value.replace(/\D/g, '')) intl = field.value.trim().startsWith('+'); else if (field.value.trim().startsWith('+')) intl = true; field.value = maskPhone(field.value, intl); if (end) field.setSelectionRange(field.value.length, field.value.length); }); }
    if (key === 'email') field.inputMode = 'email';
    if (key === 'personal' || key === 'business') { field.autocapitalize = 'none'; field.spellcheck = false; }
    field.oninput = () => { field.removeAttribute('aria-invalid'); };
    if (key === 'phone') { const t = el('div', undefined, 'telefone'); t.append(el('span', '+55', 'ddi'), field); box.append(t); }
    else box.append(field);
    box.append(button);
  }

  function submit() {
    if (busy) return;
    const raw = q.options ? (q.multi ? selected : selected[0]) : field.value;
    let value;
    try { value = validate(key, raw); } catch (e) { showError(friendly(key, raw, e.message), field); return; }
    interacted = true;
    delete drafts[key];
    const gen = generation;
    const answers = {...state.answers, [key]: value};
    state = {...state, answers, next: next(answers)};
    // Queue the save before drawing the next step: the agenda waits for this chain.
    chain = chain.then(async () => {
      if (gen !== generation) return;
      try {
        const j = await api('answer', {key, value});
        once('form_start', () => track('form_start'));
        if (j.lead_event) once('generate_lead', () => track('generate_lead', {event_id: j.event_id}));
        confirmed = j;
        state = {...state, event_id: j.event_id, persisted: j.persisted};
      } catch (e) {
        if (gen !== generation) return;
        generation++;
        drafts[key] = value;
        state = confirmed || {answers: {}};
        render();
        showError(e instanceof SendError ? MSG.send : (e.message || MSG.send));
        if (!token) { const again = el('button', 'Começar de novo', 'btn btn--primary btn--block'); again.type = 'button'; again.onclick = () => location.reload(); box.append(again); }
        throw e;
      }
    }).catch(() => {});
    render();
  }
  function group_reset() { box.querySelectorAll('input[type=radio]').forEach(i => { i.checked = false; }); selected = []; }

  box.onsubmit = e => { e.preventDefault(); submit(); };
  reveal(field || box.querySelector('input') || label);
}

function finishWithoutProfile() {
  const msg = bot(`Obrigado, ${first(state.answers.name)}! Pelo que você contou, a implementação ainda não é o melhor passo para você agora.\n\nQuando o momento mudar, é só preencher de novo. A gente vai gostar de conversar.`);
  msg.tabIndex = -1;
  history.append(msg);
  reveal(msg);
}

const dayFmt = new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit'});
const dayLong = new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long'});
const hourFmt = new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit'});

function whatsappButton(text) {
  const wa = el('a', text, 'btn btn--primary btn--block');
  wa.href = WHATSAPP;
  wa.rel = 'noopener';
  return wa;
}

function booked(start) {
  box.replaceChildren();
  const d = new Date(start);
  const msg = bot(`Diagnóstico marcado para ${dayLong.format(d)} às ${hourFmt.format(d)}. O convite chega no seu e-mail, e a gente confirma pelo WhatsApp.`);
  msg.tabIndex = -1;
  history.append(msg);
  box.append(whatsappButton('Confirmar no WhatsApp'));
  reveal(msg);
}

async function calendar() {
  if (state.booking) return booked(state.booking.start);
  const intro = bot(`Pronto, ${first(state.answers.name)}! Já dá para marcar o seu diagnóstico gratuito: uma conversa por vídeo em que você descobre qual time começar.\n\nEscolha o melhor horário (horário de Brasília):`);
  intro.id = 'agenda-titulo';
  intro.tabIndex = -1;
  history.append(intro);
  const cal = el('div', undefined, 'agenda agenda--viva');
  cal.setAttribute('aria-labelledby', 'agenda-titulo');
  cal.setAttribute('aria-busy', 'true');
  cal.append(el('span', 'Consultando horários…'));
  box.append(cal);
  reveal(intro);
  let j;
  const gen = generation;
  status.replaceChildren();
  await chain;
  if (gen !== generation || !cal.isConnected) return;
  try { j = await api('slots'); } catch {
    cal.remove();
    showError(MSG.agenda, null, box);
    box.append(whatsappButton('Falar no WhatsApp'));
    return;
  }
  cal.removeAttribute('aria-busy');
  cal.replaceChildren();
  if (!j.slots.length) {
    cal.remove();
    showError(MSG.agenda, null, box);
    box.append(whatsappButton('Falar no WhatsApp'));
    return;
  }
  const days = [...new Set(j.slots.map(s => s.day))];
  const dayRow = el('div', undefined, 'agenda__lista');
  dayRow.setAttribute('role', 'group');
  dayRow.setAttribute('aria-label', 'Dia');
  const hours = el('div', undefined, 'agenda__lista');
  hours.setAttribute('role', 'group');
  hours.setAttribute('aria-label', 'Horário');
  const action = el('div', undefined, 'book');
  let chosen = null;

  function pickDay(day, button) {
    dayRow.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    hours.replaceChildren();
    action.replaceChildren();
    chosen = null;
    for (const slot of j.slots.filter(s => s.day === day)) {
      const b = el('button', hourFmt.format(new Date(slot.start)), 'slot');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.onclick = () => {
        hours.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        chosen = slot.start;
        action.replaceChildren();
        const confirm = el('button', 'Confirmar horário', 'btn btn--primary btn--block');
        confirm.type = 'button';
        if (!j.booking_enabled) {
          confirm.disabled = true;
          action.append(confirm, el('p', 'Prévia para revisão: a marcação está desligada e nenhum convite é enviado.', 'agenda__nota'));
          return;
        }
        confirm.onclick = async () => {
          if (busy || !chosen) return;
          busy = true;
          confirm.disabled = true;
          status.replaceChildren(el('span', 'Marcando…'));
          try {
            const r = await api('book', {start: chosen});
            once('schedule', () => track('schedule', {event_id: state.event_id}));
            status.replaceChildren();
            booked(r.start);
          } catch (e) {
            showError(e instanceof SendError ? MSG.agenda : e.message);
            confirm.disabled = false;
          } finally {
            busy = false;
          }
        };
        action.append(confirm);
      };
      hours.append(b);
    }
  }

  for (const day of days) {
    const b = el('button', dayFmt.format(new Date(day + 'T15:00:00Z')), 'slot');
    b.type = 'button';
    b.onclick = () => pickDay(day, b);
    dayRow.append(b);
  }
  const grade = el('div', undefined, 'agenda__grade');
  grade.append(dayRow, hours);
  cal.append(grade, action);
  pickDay(days[0], dayRow.firstChild);
}

async function boot() {
  const had = !!token;
  try {
    const j = token ? await api('session', {}) : await api('session', {attribution});
    if (j.token) { token = j.token; sessionStorage.setItem('ia-session', token); }
    state = j;
    confirmed = j;
    render();
  } catch (e) {
    if (had && !token) return boot(); // expired or invalid session: start a fresh one
    renderHistory();
    showError(MSG.send);
    const again = el('button', 'Tentar de novo', 'btn btn--primary btn--block');
    again.type = 'button';
    again.onclick = () => location.reload();
    box.replaceChildren(again);
  }
}

for (const a of document.querySelectorAll('a[href="#conversa"]')) a.addEventListener('click', e => {
  e.preventDefault();
  interacted = true;
  card.scrollIntoView({behavior: REDUCE ? 'auto' : 'smooth', block: 'start'});
  const t = box.querySelector('.input, .opcao input, .slot, button') || history.lastElementChild;
  setTimeout(() => t?.focus({preventScroll: true}), REDUCE ? 0 : 450);
});
boot();
