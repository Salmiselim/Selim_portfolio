// GET /admin (rewritten to /api/admin): your private statistics dashboard.
// Anyone without a valid admin session gets the same plain 404 as any missing page.
import { db } from './_lib/db.mjs';
import { env, isAdmin, notFound } from './_lib/security.mjs';

const RANGES = {
  '24h': { label: '24 hours', interval: '24 hours', bucket: 'hour' },
  '7d': { label: '7 days', interval: '7 days', bucket: 'day' },
  '30d': { label: '30 days', interval: '30 days', bucket: 'day' },
  '90d': { label: '90 days', interval: '90 days', bucket: 'day' },
  '365d': { label: '12 months', interval: '365 days', bucket: 'week' },
};

const EVENT_LABELS = {
  'resume-download': 'Résumé downloaded',
  'itch-click': 'Opened itch.io',
  'video-play': 'Played a video',
  'screenshot-open': 'Opened a screenshot',
  'email-click': 'Clicked email',
  'email-copy': 'Copied email',
  'linkedin-click': 'Opened LinkedIn',
  'github-click': 'Opened GitHub',
};

export default {
  async fetch(request) {
    if (request.method !== 'GET' || !isAdmin(request)) return notFound();

    const url = new URL(request.url);
    const key = RANGES[url.searchParams.get('range')] ? url.searchParams.get('range') : '7d';
    const range = RANGES[key];
    const tz = env('STATS_TIMEZONE') || 'Africa/Tunis';

    let html;
    try {
      const data = await load(range, tz);
      html = render({ key, range, tz, data });
    } catch (err) {
      console.error('[admin] dashboard failed', err);
      html = page('Stats', `<main class="wrap"><h1>Stats</h1><p class="err">Could not load statistics. Check that the database is connected (DATABASE_URL) and see the Vercel function logs.</p></main>`);
    }
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, private',
        'x-robots-tag': 'noindex, nofollow',
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      },
    });
  },
};

/* ------------------------------------------------------------------ data */

async function load(range, tz) {
  const c = await db();
  const iv = range.interval;
  const num = (v) => Number(v) || 0;
  const W = `ts > now() - $1::interval`;

  const kpiSql = (where) => `select
      count(*) filter (where kind = 'pageview') as pageviews,
      count(distinct visitor) filter (where kind = 'pageview') as visitors,
      round(avg(duration) filter (where kind = 'pageview' and duration > 0)) as avg_time,
      count(*) filter (where kind = 'event' and name = 'resume-download') as resume,
      count(*) filter (where kind = 'event' and name = 'video-play') as videos,
      count(*) filter (where kind = 'event' and name = 'itch-click') as itch,
      count(*) filter (where kind = 'event' and name in ('email-click', 'email-copy', 'linkedin-click', 'github-click')) as contact
    from stats_events where ${where}`;

  const [kpi] = await c.query(kpiSql(W), [iv]);
  const [prev] = await c.query(kpiSql(`ts > now() - ($1::interval * 2) and ts <= now() - $1::interval`), [iv]);

  const series = await c.query(
    `with b as (
       select generate_series(date_trunc($3, (now() - $1::interval) at time zone $2),
                              date_trunc($3, now() at time zone $2), ('1 ' || $3)::interval) as bucket)
     select to_char(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS') as bucket,
            count(e.id) filter (where e.kind = 'pageview') as pageviews,
            count(distinct e.visitor) filter (where e.kind = 'pageview') as visitors
     from b left join stats_events e
       on e.ts > now() - $1::interval and date_trunc($3, e.ts at time zone $2) = b.bucket
     group by b.bucket order by b.bucket`,
    [iv, tz, range.bucket],
  );

  const top = (col, extraWhere = '') =>
    c.query(
      `select ${col} as label, count(distinct visitor) as visitors, count(*) as hits
       from stats_events where ${W} and kind = 'pageview' ${extraWhere}
       group by 1 order by 2 desc, 3 desc limit 10`,
      [iv],
    );

  const [pages, sources, countries, cities, devices, browsers, oses] = await Promise.all([
    top('path'),
    c.query(
      `select coalesce(src, 'Direct / unknown') as label, count(*) as visitors, count(*) as hits from (
         select (array_agg(coalesce(nullif(utm_source, ''), referrer) order by ts)
                   filter (where coalesce(nullif(utm_source, ''), referrer) is not null))[1] as src
         from stats_events where ${W} and kind = 'pageview'
         group by visitor, date_trunc('day', ts)) v
       group by 1 order by 2 desc limit 10`,
      [iv],
    ),
    top(`coalesce(country, '??')`),
    top(`coalesce(city, 'Unknown') || '|' || coalesce(country, '??')`),
    top(`coalesce(device, 'Unknown')`),
    top(`coalesce(browser, 'Unknown')`),
    top(`coalesce(os, 'Unknown')`),
  ]);

  const events = await c.query(
    `select name, coalesce(props->>'game', props->>'project', props->>'from', '') as detail, count(*) as n
     from stats_events where ${W} and kind = 'event' group by 1, 2 order by 3 desc limit 40`,
    [iv],
  );

  const [live] = await c.query(
    `select count(distinct visitor) as n,
            array_remove(array_agg(distinct path) filter (where kind = 'pageview'), null) as pages
     from stats_events where ts > now() - interval '5 minutes'`,
  );

  const visits = await c.query(
    `select min(ts) as first_ts, max(ts) as last_ts,
            max(country) as country, max(city) as city, max(device) as device, max(browser) as browser, max(os) as os,
            (array_agg(coalesce(nullif(utm_source, ''), referrer) order by ts) filter (where kind = 'pageview' and coalesce(nullif(utm_source, ''), referrer) is not null))[1] as source,
            array_agg(path order by ts) filter (where kind = 'pageview') as pages,
            array_agg(name || coalesce(':' || coalesce(props->>'game', props->>'project', props->>'from'), '') order by ts) filter (where kind = 'event') as events,
            coalesce(sum(duration) filter (where kind = 'pageview'), 0) as seconds
     from stats_events where ${W}
     group by visitor, date_trunc('day', ts at time zone $2)
     order by max(ts) desc limit 50`,
    [iv, tz],
  );

  const pick = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, num(v)]));
  return {
    kpi: pick(kpi),
    prev: pick(prev),
    series: series.map((r) => ({ bucket: new Date(`${r.bucket}Z`), pageviews: num(r.pageviews), visitors: num(r.visitors) })),
    pages, sources, countries, cities, devices, browsers, oses, events, visits,
    live: { n: num(live?.n), pages: live?.pages || [] },
  };
}

/* ---------------------------------------------------------------- render */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = (n) => new Intl.NumberFormat('en-US').format(Number(n) || 0);
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (code) => {
  if (!code || code === '??') return 'Unknown';
  try { return regionNames.of(code) || code; } catch { return code; }
};
const duration = (s) => {
  s = Math.round(Number(s) || 0);
  if (!s) return '–';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const pageName = (p) => {
  if (p === '/') return 'Home';
  if (p === '/arcade') return 'Arcade (Snake)';
  const m = /^\/projects\/([^/?#]+)/.exec(p || '');
  return m ? `Project · ${m[1]}` : p;
};
const eventLabel = (name) => EVENT_LABELS[name] || name;

function delta(now, before) {
  if (!before && !now) return '';
  if (!before) return '<span class="d up">new</span>';
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return '<span class="d">±0%</span>';
  return `<span class="d ${pct > 0 ? 'up' : 'down'}">${pct > 0 ? '+' : ''}${pct}%</span>`;
}

function chart(series, bucket, tz) {
  const W = 1000, H = 220, pad = 24;
  const max = Math.max(1, ...series.map((s) => s.pageviews));
  const n = Math.max(1, series.length);
  const bw = (W - pad * 2) / n;
  const fmtLabel = new Intl.DateTimeFormat('en-GB', bucket === 'hour' ? { hour: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const every = Math.ceil(n / 10);
  let bars = '';
  series.forEach((s, i) => {
    const x = pad + i * bw;
    const hp = ((H - 40) * s.pageviews) / max;
    const hv = ((H - 40) * s.visitors) / max;
    const tip = `${fmtLabel.format(s.bucket)}: ${s.visitors} visitors, ${s.pageviews} page views`;
    bars += `<g><title>${esc(tip)}</title>
      <rect x="${(x + bw * 0.12).toFixed(1)}" y="${(H - 24 - hp).toFixed(1)}" width="${(bw * 0.76).toFixed(1)}" height="${hp.toFixed(1)}" rx="2" fill="rgba(162,116,255,.28)"/>
      <rect x="${(x + bw * 0.26).toFixed(1)}" y="${(H - 24 - hv).toFixed(1)}" width="${(bw * 0.48).toFixed(1)}" height="${hv.toFixed(1)}" rx="2" fill="#a274ff"/></g>`;
    if (i % every === 0) bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(fmtLabel.format(s.bucket))}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitors and page views over time" preserveAspectRatio="none">
    <line x1="${pad}" x2="${W - pad}" y1="${H - 24}" y2="${H - 24}" stroke="rgba(239,234,247,.15)"/>${bars}</svg>
    <p class="legend"><span class="sw v"></span>Visitors <span class="sw p"></span>Page views · max ${fmt(max)}</p>`;
}

function list(title, rows, labelFn = (l) => l) {
  const max = Math.max(1, ...rows.map((r) => Number(r.visitors) || 0));
  const body = rows.length
    ? rows.map((r) => `<li><span class="bar" style="width:${Math.round((100 * (Number(r.visitors) || 0)) / max)}%"></span>
        <span class="l">${esc(labelFn(r.label))}</span><span class="n">${fmt(r.visitors)}</span></li>`).join('')
    : '<li class="empty">No data yet</li>';
  return `<section class="panel"><h2>${esc(title)}<span>visitors</span></h2><ul class="rows">${body}</ul></section>`;
}

function render({ key, range, tz, data }) {
  const { kpi, prev } = data;
  const tabs = Object.entries(RANGES).map(([k, r]) => `<a href="?range=${k}"${k === key ? ' aria-current="page"' : ''}>${esc(r.label)}</a>`).join('');
  const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: tz });
  const timeOnly = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });

  const kpis = [
    ['Visitors', fmt(kpi.visitors), delta(kpi.visitors, prev.visitors)],
    ['Page views', fmt(kpi.pageviews), delta(kpi.pageviews, prev.pageviews)],
    ['Avg. time on a page', duration(kpi.avg_time), ''],
    ['Résumé downloads', fmt(kpi.resume), delta(kpi.resume, prev.resume)],
    ['Video plays', fmt(kpi.videos), delta(kpi.videos, prev.videos)],
    ['itch.io clicks', fmt(kpi.itch), delta(kpi.itch, prev.itch)],
    ['Contact clicks', fmt(kpi.contact), delta(kpi.contact, prev.contact)],
  ].map(([l, v, d]) => `<div class="kpi"><span class="kl">${esc(l)}</span><span class="kv">${v}</span>${d}</div>`).join('');

  const eventsHtml = data.events.length
    ? data.events.map((e) => `<li><span class="l">${esc(eventLabel(e.name))}${e.detail ? ` <em>${esc(e.detail)}</em>` : ''}</span><span class="n">${fmt(e.n)}</span></li>`).join('')
    : '<li class="empty">No clicks recorded yet</li>';

  const visitsHtml = data.visits.length
    ? data.visits.map((v) => {
        const place = [v.city, countryName(v.country)].filter((x) => x && x !== 'Unknown').join(', ') || 'Unknown location';
        const pages = (v.pages || []).map((p) => `<li>${esc(pageName(p))}</li>`).join('');
        const evs = (v.events || []).map((e) => {
          const [name, detail] = String(e).split(':');
          return `<span class="chip">${esc(eventLabel(name))}${detail ? ` · ${esc(detail)}` : ''}</span>`;
        }).join('');
        return `<li class="visit">
          <div class="vh"><strong>${esc(place)}</strong><span>${esc(when.format(new Date(v.first_ts)))}${
            new Date(v.last_ts) - new Date(v.first_ts) > 60000 ? ` – ${esc(timeOnly.format(new Date(v.last_ts)))}` : ''}</span></div>
          <div class="vm">${esc(v.device || '?')} · ${esc(v.browser || '?')} · ${esc(v.os || '?')} · from <b>${esc(v.source || 'direct')}</b> · ${duration(v.seconds)} on site</div>
          ${pages ? `<ol class="path">${pages}</ol>` : ''}${evs ? `<div class="chips">${evs}</div>` : ''}
        </li>`;
      }).join('')
    : '<li class="empty">No visits yet. Once the site is live, visits appear here within seconds.</li>';

  const body = `
  <header class="top">
    <div class="wrap bar">
      <div class="brand"><span class="logo">S</span><div><strong>Portfolio stats</strong><small>Private · only you can see this</small></div></div>
      <div class="right">
        <span class="live${data.live.n ? ' on' : ''}"><i></i>${fmt(data.live.n)} on the site now</span>
        <a class="btn" href="?range=${key}">Refresh</a>
        <a class="btn ghost" href="/api/auth/logout">Sign out</a>
      </div>
    </div>
  </header>
  <main class="wrap">
    <nav class="tabs" aria-label="Time range">${tabs}</nav>
    <section class="kpis">${kpis}</section>
    <p class="note">Compared with the previous ${esc(range.label)}. Visitors are counted once per day (cookie-free), so someone returning tomorrow counts again. Bots and your own visits while signed in are not counted.</p>
    <section class="panel chart"><h2>Traffic<span>${esc(range.label)}</span></h2>${chart(data.series, range.bucket, tz)}</section>
    ${data.live.n ? `<section class="panel"><h2>Right now<span>last 5 minutes</span></h2><ul class="rows">${data.live.pages.map((p) => `<li><span class="l">${esc(pageName(p))}</span></li>`).join('')}</ul></section>` : ''}
    <div class="grid">
      ${list('Pages', data.pages, pageName)}
      ${list('Where visitors came from', data.sources)}
      ${list('Countries', data.countries, countryName)}
      ${list('Cities', data.cities, (l) => { const [city, cc] = String(l).split('|'); return `${city}, ${countryName(cc)}`; })}
      ${list('Devices', data.devices)}
      ${list('Browsers', data.browsers)}
      ${list('Operating systems', data.oses)}
      <section class="panel"><h2>What people clicked<span>times</span></h2><ul class="rows plain">${eventsHtml}</ul></section>
    </div>
    <section class="panel"><h2>Recent visits<span>newest first · up to 50</span></h2><ul class="visits">${visitsHtml}</ul></section>
    <footer class="foot">Times in ${esc(tz)} · Data stays in your own database.</footer>
  </main>`;
  return page('Portfolio stats', body);
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}

const CSS = `
:root{color-scheme:dark;--bg:#110f16;--bg2:#16131d;--card:#1c1825;--line:rgba(239,234,247,.1);--fg:#efeaf7;--muted:#b0a8c0;--subtle:#8f87a1;--ac:#a274ff;--ink:#13091f;--good:#4ade80;--bad:#fb7185}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit}.wrap{width:min(1200px,100% - 32px);margin-inline:auto}
.top{position:sticky;top:0;z-index:2;background:rgba(17,15,22,.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px;flex-wrap:wrap;padding-block:8px}
.brand{display:flex;align-items:center;gap:12px}.brand small{display:block;color:var(--subtle);font-size:12px}
.logo{display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:var(--ac);color:var(--ink);font-weight:800}
.right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;min-height:38px;padding:0 14px;border-radius:999px;background:var(--ac);color:var(--ink);text-decoration:none;font-weight:600;font-size:14px}
.btn.ghost{background:none;color:var(--fg);border:1px solid var(--line)}
.live{display:inline-flex;align-items:center;gap:8px;color:var(--muted);font-size:14px}.live i{width:8px;height:8px;border-radius:50%;background:var(--subtle)}
.live.on i{background:var(--good);box-shadow:0 0 0 4px rgba(74,222,128,.15)}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:24px 0 16px}.tabs a{padding:8px 14px;border-radius:999px;border:1px solid var(--line);text-decoration:none;color:var(--muted);font-size:14px}
.tabs a[aria-current]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:grid;gap:2px}
.kl{color:var(--muted);font-size:13px}.kv{font-size:28px;font-weight:700;letter-spacing:-.02em}
.d{font-size:12px;color:var(--subtle)}.d.up{color:var(--good)}.d.down{color:var(--bad)}
.note{color:var(--subtle);font-size:13px;margin:10px 2px 18px}
.panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:16px;min-width:0}
.panel h2{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 12px;font-size:15px}.panel h2 span{color:var(--subtle);font-weight:400;font-size:12px}
.chart svg{width:100%;height:220px;display:block}.chart text{fill:var(--subtle);font-size:11px}
.legend{color:var(--subtle);font-size:12px;margin:8px 0 0}.sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 6px 0 12px;vertical-align:-1px}.sw.v{background:var(--ac);margin-left:0}.sw.p{background:rgba(162,116,255,.35)}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}@media(max-width:800px){.grid{grid-template-columns:minmax(0,1fr)}}
.rows{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.rows li{position:relative;display:flex;justify-content:space-between;gap:12px;padding:7px 10px;border-radius:8px;overflow:hidden}
.rows .bar{position:absolute;inset:0 auto 0 0;background:rgba(162,116,255,.14);border-radius:8px;z-index:0}
.rows .l,.rows .n{position:relative;z-index:1}.rows .l{overflow-wrap:anywhere}.rows .n{font-variant-numeric:tabular-nums;color:var(--muted)}
.rows em{font-style:normal;color:var(--subtle)}.plain li{border-bottom:1px solid var(--line);border-radius:0}
.empty{color:var(--subtle)}
.visits{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.visit{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--bg2)}
.vh{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.vh span{color:var(--subtle);font-size:13px}
.vm{color:var(--muted);font-size:13px;margin-top:2px}.vm b{color:var(--fg);font-weight:600}
.path{display:flex;flex-wrap:wrap;gap:4px 0;margin:8px 0 0;padding:0;list-style:none;font-size:13px}
.path li+li::before{content:"→";color:var(--ac);margin:0 8px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.chip{font-size:12px;padding:3px 9px;border-radius:999px;background:rgba(162,116,255,.16);color:var(--fg)}
.foot{color:var(--subtle);font-size:12px;padding:8px 2px 40px}.err{color:var(--bad)}
`;
