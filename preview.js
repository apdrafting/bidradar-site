const results = document.getElementById('results');
const status = document.getElementById('status');
const retry = document.getElementById('retry');
let counts = null, liveItems = [], loading = false;
const MAX_AGE = 86400000;
function el(tag, text, cls) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function fresh(data) {
  const timestamp = new Date(data?.checkedAt).getTime();
  const age = Date.now() - timestamp;
  return Number.isSafeInteger(data?.total) && data.total >= 0 &&
    Number.isFinite(timestamp) && age <= MAX_AGE && age >= -300000;
}
function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
function render() {
  results.replaceChildren();
  document.getElementById('search').hidden = !liveItems.length;
  if (!counts || !fresh(counts)) {
    status.textContent = loading ? 'Loading official sources…' : 'Current source data is unavailable or outdated. Retry to check again.';
    return;
  }
  const trade = document.getElementById('trade').value;
  const query = document.getElementById('search').value.trim().toLowerCase();
  const count = trade ? (trade === 'Unclassified' ? counts.unclassified : counts.byTrade?.[trade]) : counts.total;
  const sources = Array.isArray(counts.sources) ? counts.sources : [];
  const unavailable = sources.filter(source => source.available !== true).length;
  const totalText = Number.isSafeInteger(count) && count >= 0 ? `${count} source notices` : 'Trade count unavailable';
  status.textContent = `${totalText}${trade ? ' matching '+trade : ''} · Checked ${new Date(counts.checkedAt).toLocaleString()}.` +
    (sources.length ? ` ${sources.length-unavailable} of ${sources.length} sources responding.` : '') +
    ' Counts can overlap across trades; verify scope and deadlines with the agency.';
  if (unavailable) status.textContent += ' Coverage is incomplete while some sources are unavailable.';
  const matching = liveItems.filter(item => {
    const trades = Array.isArray(item.trades) ? item.trades : [item.trade || item.category || 'Unclassified'];
    return (!trade || trades.some(value => String(value).toLowerCase() === trade.toLowerCase())) &&
      (!query || [item.title, item.name, item.agency, item.organization, item.city, item.deadline, item.source].some(value => String(value || '').toLowerCase().includes(query)));
  });
  let shown = 0;
  for (const item of matching) {
    const url = safeUrl(item.sourceUrl || item.url || item.link || item.noticeUrl);
    if (!url) continue;
    const card = el('article', '', 'card');
    card.append(el('span', 'SOURCE-LINKED CANDIDATE', 'tag'), el('h2', String(item.title || item.name || 'Untitled solicitation')),
      el('p', [item.agency || item.organization, item.city, item.deadline || item.dueDate].filter(Boolean).join(' · '), 'detail'));
    const link = el('a', 'Review original notice →');
    link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    card.append(link); results.append(card);
    if (++shown === 250) break;
  }
  if (liveItems.length) {
    status.textContent += ` Showing ${shown} matching candidate notices${shown === 250 ? ' (display limit 250)' : ''}.`;
    if (!shown) results.append(el('p', 'No usable notices match these filters. Try another trade or clear your search.'));
    return;
  }
  results.append(el('p', 'The public API currently provides source totals only, not individual bid details. Use the email-verified trial or member dashboard to explore available listings.'));
  const member = el('a', 'Explore trial signup →'); member.href = 'start.html'; results.append(member);
  for (const source of sources) {
    const card = el('article', '', 'card');
    card.append(el('span', source.available === true ? 'SOURCE RESPONDING' : 'SOURCE UNAVAILABLE', 'tag'), el('h2', String(source.name || source.label || 'Procurement source')));
    card.append(el('p', source.available === true ? 'Source responded at the last check. This is not an individual bid listing.' : 'This source could not be checked. Its notices may be missing from the totals.', 'detail'));
    const url = safeUrl(source.url || source.sourceUrl || source.website);
    if (url) { const link = el('a', 'Visit official source →'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; card.append(link); }
    results.append(card);
  }
}
for (const id of ['trade', 'search']) document.getElementById(id).addEventListener('input', render);
for (const id of ['sector', 'kind']) document.getElementById(id).hidden = true;
async function fetchJson(url) {
  const response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('Request failed');
  const data = await response.json();
  if (!fresh(data)) throw Error('Invalid or stale data');
  return data;
}
async function load() {
  if (loading) return;
  loading = true; retry.hidden = true; results.setAttribute('aria-busy', 'true');
  counts = null; liveItems = []; render();
  try {
    let data;
    try {
      const candidate = await fetchJson('./data/construction-bids.json');
      if (Array.isArray(candidate.opportunities) && candidate.opportunities.length) data = candidate;
    } catch {}
    if (!data) {
      const origin = location.hostname === 'bidradaralerts.com' || location.hostname === 'www.bidradaralerts.com'
        ? location.origin : 'https://bidradar-api.bidradar-alerts-help.workers.dev';
      data = await fetchJson(origin + '/opportunities?summary=3');
    }
    counts = data;
    liveItems = (Array.isArray(data.opportunities) ? data.opportunities : Array.isArray(data.items) ? data.items : []).filter(item => item && typeof item === 'object');
  } catch { counts = null; liveItems = []; }
  finally {
    loading = false; retry.hidden = !!counts; results.setAttribute('aria-busy', 'false'); render();
  }
}
retry.addEventListener('click', load);
load(); setInterval(load, 900000);
