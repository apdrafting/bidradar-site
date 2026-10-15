const results = document.getElementById('results'), status = document.getElementById('status');
let counts = null, liveItems = [];

function el(tag, text, cls) {
  const e = document.createElement(tag);
  e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

function getTrade(item) {
  if (item.trade) return String(item.trade);
  if (item.category) return String(item.category);
  const text = (String(item.title || '') + ' ' + String(item.description || '')).toLowerCase();
  if (/architect/.test(text)) return 'Architecture';
  if (/hvac|mechanical/.test(text)) return 'HVAC';
  if (/electrical/.test(text)) return 'Electrical';
  if (/plumb/.test(text)) return 'Plumbing';
  if (/roof/.test(text)) return 'Roofing';
  if (/landscap/.test(text)) return 'Landscaping';
  if (/engineering/.test(text)) return 'Engineering';
  if (/civil|paving|asphalt|concrete|grading|excavat|roadway|bridge|sidewalk|sewer|water main|storm drain/.test(text)) return 'Civil';
  if (/construction|renovation|remodel|rehabilitat|repair|demolition|building improvement|public works|seismic/.test(text)) return 'Construction';
  return 'Unclassified';
}

function render() {
  const tradeEl = document.getElementById('trade');
  const searchEl = document.getElementById('search');
  const trade = tradeEl ? tradeEl.value : '';
  const query = searchEl ? searchEl.value.trim().toLowerCase() : '';

  results.replaceChildren();

  if (!counts) {
    status.textContent = 'Live source totals unavailable. No opportunity count can be verified at this time.';
    return;
  }

  const count = trade ? (trade === 'Unclassified' ? (counts.unclassified || 0) : ((counts.byTrade || {})[trade] || 0)) : counts.total;
  const checked = new Date(counts.checkedAt), valid = Number.isFinite(checked.getTime());
  const age = valid ? Date.now() - checked.getTime() : Infinity;

  if (age > 86400000 || age < -300000) {
    status.textContent = 'Source totals are stale or undated; current opportunity count cannot be verified.';
    return;
  }

  status.textContent = (liveItems.length ? liveItems.length + ' source-linked candidate notices' : count + ' source notices') +
                       ' · Last checked ' + checked.toLocaleString() + '. Verify scope and deadlines with each issuing agency.';

  if (liveItems.length > 0) {
    const tradeItems = liveItems.filter(item => {
      const itemTrade = getTrade(item);
      const matchTrade = !trade || itemTrade.toLowerCase().includes(trade.toLowerCase()) || (trade === 'Construction' && itemTrade !== 'Unclassified');
      const matchQuery = !query || [item.title, item.agency, item.city, item.deadline, item.source, itemTrade].some(v => String(v || '').toLowerCase().includes(query));
      return matchTrade && matchQuery;
    });

    for (const item of tradeItems.slice(0, 250)) {
      const title = String(item.title || item.name || 'Untitled solicitation');
      const url = item.sourceUrl || item.url || item.link || item.noticeUrl;
      if (typeof url !== 'string' || !/^https:\/\//i.test(url)) continue;

      const card = el('article', '', 'card');
      const itemTrade = getTrade(item);
      card.append(el('span', itemTrade ? itemTrade.toUpperCase() : 'SOURCE-LINKED OPPORTUNITY', 'tag'), el('h2', title));
      card.append(el('p', [item.agency || item.organization, item.city, item.deadline || item.dueDate].filter(Boolean).join(' · '), 'detail'));
      const a = el('a', 'Review original notice →');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      card.append(a);
      results.append(card);
    }

    if (!results.children.length) {
      results.append(el('p', 'No candidate notices found matching your selected trade or search criteria.', 'note'));
    }
    return;
  }

  const sources = Array.isArray(counts.sources) ? counts.sources : [];
  for (const source of sources) {
    const card = el('article', '', 'card');
    card.append(el('span', source.available ? 'SOURCE RESPONDING' : 'SOURCE UNAVAILABLE', 'tag'), el('h2', source.name || source.label || 'Procurement source'), el('p', 'Review the issuing agency’s current solicitation details, eligibility and deadline.', 'detail'));
    const url = source.url || source.sourceUrl || source.website;
    if (typeof url === 'string' && /^https:\/\//i.test(url)) {
      const a = el('a', 'Visit official source →');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      card.append(a);
    }
    results.append(card);
  }

  if (!sources.length) {
    results.append(el('p', 'Source details are not currently available. Please check back after the next feed refresh.'));
  }
}

const tradeSelect = document.getElementById('trade');
if (tradeSelect) {
  tradeSelect.addEventListener('input', render);
  tradeSelect.addEventListener('change', render);
}

for (const id of ['sector', 'kind']) {
  const elem = document.getElementById(id);
  if (elem) elem.hidden = true;
}

const searchInput = document.getElementById('search');
if (searchInput) {
  searchInput.addEventListener('input', render);
}

async function load() {
  try {
    let data = null;
    try {
      const local = await fetch('./data/construction-bids.json', { cache: 'no-store' });
      if (local.ok) {
        const candidate = await local.json();
        if (Array.isArray(candidate.opportunities) && candidate.opportunities.length &&
            Number.isFinite(new Date(candidate.checkedAt).getTime()) &&
            Date.now() - new Date(candidate.checkedAt).getTime() <= 86400000 &&
            new Date(candidate.checkedAt).getTime() <= Date.now() + 300000) {
          data = candidate;
        }
      }
    } catch {}

    if (!data) {
      const r = await fetch('https://bidradar-api.bidradar-alerts-help.workers.dev/opportunities?summary=3', { cache: 'no-store' });
      if (!r.ok) throw Error('Source request failed');
      data = await r.json();
    }

    if (!Number.isSafeInteger(data.total) || data.total < 0 || !data.checkedAt) throw Error('Invalid source data');
    const verifiedTime = new Date(data.checkedAt).getTime();
    if (!Number.isFinite(verifiedTime) || Date.now() - verifiedTime > 86400000 || verifiedTime > Date.now() + 300000) throw Error('Stale or invalid source data');

    counts = data;
    liveItems = Array.isArray(data.opportunities) ? data.opportunities : Array.isArray(data.items) ? data.items : [];
    render();
  } catch {
    counts = null;
    liveItems = [];
    render();
  }
}

load();
setInterval(load, 900000);
