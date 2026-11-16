// Awesome AI Discoveries. Renders data/discoveries.json (built by generate_data.py).

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
// The bot prefixes categories with an emoji ("🤖 Agents"); show the words only.
const topicName = (c) => String(c || 'Other').replace(/^[^\p{L}\p{N}]+/u, '').trim() || 'Other';
const fmtDate = (iso, opts = { day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
const fmtStars = (n) => (n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : n.toLocaleString('en-GB'));
const safeUrl = (u) => (/^https:\/\/github\.com\//.test(u) ? u : '#');

const PAGE = 40;
const state = { items: [], topic: '', lang: '', sort: 'date', query: '', shown: PAGE };

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  let data = null;
  try { data = await (await fetch('data/discoveries.json')).json(); } catch (e) { data = null; }
  if (data && data.discoveries?.length) {
    state.items = data.discoveries.map((d) => ({ ...d, topic: topicName(d.category) }));
    renderUpdated(data.generated_at);
    renderHeadline(state.items);
    renderDays(state.items);
    renderTopics(state.items);
    initTable();
  } else {
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="5" class="empty">The list could not be loaded.</td></tr>';
  }
  initBand();
  initReveal();
});

function initTheme() {
  const root = document.documentElement;
  const dark = matchMedia('(prefers-color-scheme: dark)');
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = (root.dataset.theme || (dark.matches ? 'dark' : 'light')) === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
}

function renderUpdated(iso) {
  if (!iso) return;
  document.getElementById('updated').textContent =
    `Updated ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/* ---------- Band ---------- */

function renderHeadline(items) {
  const dates = items.map((i) => i.date).sort();
  const counts = countBy(items, (i) => i.topic);
  const [topTopic, topN] = counts[0];
  const langs = countBy(items, (i) => i.language || 'Unknown');
  const [topLang, langN] = langs[0];
  const cards = [
    { value: items.length.toLocaleString('en-GB'), label: 'repositories logged so far.', context: `since ${fmtDate(dates[0], { day: 'numeric', month: 'short', year: 'numeric' })}` },
    { value: `${Math.round((topN / items.length) * 100)}%`, label: `are about ${topTopic.toLowerCase()}, the biggest topic by far.`, context: `${topN} repos` },
    { value: `${Math.round((langN / items.length) * 100)}%`, label: `are written mainly in ${topLang}.`, context: `${langs.length} languages in all` },
  ];
  document.getElementById('headline').innerHTML = cards.map((c) => `
    <div class="outcome">
      <dt class="outcome-label">${esc(c.label)}</dt>
      <dd class="outcome-value">${esc(c.value)}</dd>
      <dd class="outcome-context">${esc(c.context)}</dd>
    </div>`).join('');
}

function countBy(items, key) {
  const m = new Map();
  items.forEach((i) => m.set(key(i), (m.get(key(i)) || 0) + 1));
  return [...m].sort((a, b) => b[1] - a[1]);
}

/* ---------- Latest finds ---------- */

function renderDays(items) {
  const byDay = new Map();
  [...items].sort((a, b) => b.date.localeCompare(a.date)).forEach((i) => {
    if (!byDay.has(i.date)) byDay.set(i.date, []);
    byDay.get(i.date).push(i);
  });
  const days = [...byDay].slice(0, 4);
  document.getElementById('days').innerHTML = days.map(([date, list]) => `
    <div class="day">
      <p class="day-date">${fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
      <ul class="finds">
        ${list.map((i) => {
          const [owner, repo] = i.name.split('/');
          return `<li>
            <p class="find-name"><a href="${esc(safeUrl(i.url))}" rel="noopener"><span class="find-owner">${esc(owner)}/</span>${esc(repo || owner)}</a></p>
            ${i.description ? `<p class="find-desc">${esc(i.description)}</p>` : ''}
            <p class="find-meta"><span class="topic">${esc(i.topic)}</span> · ${esc(i.language || 'Unknown')} · ${esc(i.stars_formatted || String(i.stars))} stars</p>
          </li>`;
        }).join('')}
      </ul>
    </div>`).join('');
}

/* ---------- Topics ---------- */

function renderTopics(items) {
  const counts = countBy(items, (i) => i.topic);
  const max = counts[0][1];
  const list = document.getElementById('topicBars');
  list.innerHTML = counts.map(([t, n]) => `
    <li class="topic-row">
      <button type="button" data-topic="${esc(t)}">${esc(t)}</button>
      <span class="topic-track" aria-hidden="true"><i style="width:${(n / max) * 100}%"></i></span>
      <span class="topic-n">${n} <span>· ${Math.round((n / items.length) * 100)}%</span></span>
    </li>`).join('');
  list.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    const sel = document.getElementById('topicSelect');
    sel.value = b.dataset.topic;
    sel.dispatchEvent(new Event('change'));
    document.getElementById('all').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
  if (!document.documentElement.classList.contains('motion')) { list.classList.add('in'); return; }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { list.classList.add('in'); io.disconnect(); }
  }, { rootMargin: '0px 0px -15% 0px' });
  io.observe(list);
}

/* ---------- Table ---------- */

function initTable() {
  const topicSel = document.getElementById('topicSelect');
  const langSel = document.getElementById('langSelect');
  countBy(state.items, (i) => i.topic).forEach(([t, n]) => topicSel.add(new Option(`${t} (${n})`, t)));
  countBy(state.items, (i) => i.language || 'Unknown').forEach(([l, n]) => langSel.add(new Option(`${l} (${n})`, l)));
  const reset = () => { state.shown = PAGE; renderTable(); };
  topicSel.addEventListener('change', () => { state.topic = topicSel.value; reset(); });
  langSel.addEventListener('change', () => { state.lang = langSel.value; reset(); });
  document.getElementById('sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; reset(); });
  document.getElementById('searchInput').addEventListener('input', (e) => { state.query = e.target.value.trim().toLowerCase(); reset(); });
  document.getElementById('moreBtn').addEventListener('click', () => { state.shown += PAGE; renderTable(); });
  renderTable();
}

function renderTable() {
  const sorters = {
    date: (a, b) => b.date.localeCompare(a.date) || b.stars - a.stars,
    stars: (a, b) => b.stars - a.stars,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  const rows = state.items
    .filter((i) => !state.topic || i.topic === state.topic)
    .filter((i) => !state.lang || (i.language || 'Unknown') === state.lang)
    .filter((i) => !state.query || `${i.name} ${i.description}`.toLowerCase().includes(state.query))
    .sort(sorters[state.sort]);
  const page = rows.slice(0, state.shown);
  document.getElementById('resultCount').textContent = `${rows.length} of ${state.items.length} repos`;
  const more = document.getElementById('moreBtn');
  more.hidden = rows.length <= state.shown;
  more.textContent = `Show ${Math.min(PAGE, rows.length - state.shown)} more`;
  document.getElementById('tableBody').innerHTML = page.length ? page.map((i) => `
    <tr>
      <td class="repo"><a href="${esc(safeUrl(i.url))}" rel="noopener">${esc(i.name)}</a>${i.description ? `<p>${esc(i.description)}</p>` : ''}</td>
      <td class="meta">${esc(i.topic)}</td>
      <td class="meta">${esc(i.language || 'Unknown')}</td>
      <td class="num">${fmtStars(i.stars)}</td>
      <td class="date">${fmtDate(i.date, { day: 'numeric', month: 'short', year: '2-digit' })}</td>
    </tr>`).join('') : '<tr><td colspan="5" class="empty">No repos match.</td></tr>';
}

/* ---------- Motion ---------- */

function initBand() {
  const band = document.querySelector('.outcomes');
  if (!document.documentElement.classList.contains('motion')) { band.classList.add('in'); return; }
  const open = () => { band.classList.add('in'); removeEventListener('scroll', check); };
  const check = () => { if (scrollY > 80 || band.getBoundingClientRect().top < innerHeight * 0.45) open(); };
  addEventListener('scroll', check, { passive: true });
  check();
}

function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!document.documentElement.classList.contains('motion')) { els.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}
