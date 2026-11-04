// GET /admin (rewritten to /api/admin): your private statistics dashboard.
// Anyone without a valid admin session gets the same plain 404 as any missing page.
// The page is rendered on the server: no JavaScript, no external requests (strict CSP).
import { db } from './_lib/db.mjs';
import { ANTON_WOFF2 } from './_lib/font.mjs';
import { env, isAdmin, notFound } from './_lib/security.mjs';

const RANGES = {
  '24h': { label: '24 hours', short: '24h', interval: '24 hours', bucket: 'hour' },
  '7d': { label: '7 days', short: '7d', interval: '7 days', bucket: 'day' },
  '30d': { label: '30 days', short: '30d', interval: '30 days', bucket: 'day' },
  '90d': { label: '90 days', short: '90d', interval: '90 days', bucket: 'day' },
  '365d': { label: '12 months', short: '12m', interval: '365 days', bucket: 'week' },
};

/** Keep in sync with the project ids in src/app/data/portfolio.data.ts (unknown ids are title-cased). */
const PROJECT_NAMES = {
  'meganopoly-xr': 'Meganopoly',
  'the-long-way-out': 'The Long Way Out',
  'magic-arena-xr': 'Magic Arena',
  'bad-ice-cream-3d': 'Bad Ice Cream 3D',
  'tunisie-securite': 'Tunisie Sécurité',
  suivital: 'Suivital',
};

const EVENTS = {
  'resume-download': { label: 'Downloaded your résumé', icon: 'file' },
  'itch-click': { label: 'Opened itch.io', icon: 'game' },
  'video-play': { label: 'Played a video', icon: 'play' },
  'screenshot-open': { label: 'Opened a screenshot', icon: 'image' },
  'email-click': { label: 'Clicked your email', icon: 'mail' },
  'email-copy': { label: 'Copied your email', icon: 'mail' },
  'linkedin-click': { label: 'Opened LinkedIn', icon: 'link' },
  'github-click': { label: 'Opened GitHub', icon: 'link' },
};
const CONTACT = `'email-click', 'email-copy', 'linkedin-click', 'github-click'`;

export default {
  async fetch(request) {
    if (request.method !== 'GET' || !isAdmin(request)) return notFound();

    const url = new URL(request.url);
    const key = RANGES[url.searchParams.get('range')] ? url.searchParams.get('range') : '7d';
    const range = RANGES[key];
    const tz = env('STATS_TIMEZONE') || 'Africa/Tunis';

    let html;
    try {
      html = render({ key, range, tz, data: await load(range, tz) });
    } catch (err) {
      console.error('[admin] dashboard failed', err);
      html = page(
        'Portfolio stats',
        `<main class="wrap"><section class="card empty-state"><h1 class="display">Couldn’t load your stats</h1>
         <p>Check that the Neon database is connected to this project (<code>DATABASE_URL</code>) and look at the Vercel function logs.</p></section></main>`,
      );
    }
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, private',
        'x-robots-tag': 'noindex, nofollow',
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
        'content-security-policy':
          "default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      },
    });
  },
};

/* ================================================================== data */

async function load(range, tz) {
  const c = await db();
  const iv = range.interval;
  const n = (v) => Number(v) || 0;
  const W = `ts > now() - $1::interval`;
  const PREV = `ts > now() - ($1::interval * 2) and ts <= now() - $1::interval`;

  const kpiSql = (where) => `
    with e as (select * from stats_events where ${where}),
    v as (
      select count(*) filter (where kind = 'pageview') as pv, count(*) filter (where kind = 'event') as ev,
             coalesce(sum(duration) filter (where kind = 'pageview'), 0) as secs
      from e group by visitor, date_trunc('day', ts at time zone $2))
    select
      (select count(*) from e where kind = 'pageview') as pageviews,
      (select count(distinct visitor) from e where kind = 'pageview') as visitors,
      (select count(*) from v) as visits,
      (select count(*) from v where pv <= 1 and ev = 0) as bounces,
      (select round(avg(secs)) from v where secs > 0) as avg_visit,
      (select count(*) from e where kind = 'event' and name = 'resume-download') as resume,
      (select count(*) from e where kind = 'event' and name = 'video-play') as videos,
      (select count(*) from e where kind = 'event' and name = 'itch-click') as itch,
      (select count(*) from e where kind = 'event' and name in (${CONTACT})) as contact`;

  const [kpi] = await c.query(kpiSql(W), [iv, tz]);
  const [prev] = await c.query(kpiSql(PREV), [iv, tz]);

  const series = await c.query(
    `with b as (
       select generate_series(date_trunc($3, (now() - $1::interval) at time zone $2),
                              date_trunc($3, now() at time zone $2), ('1 ' || $3)::interval) as bucket)
     select to_char(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS') as bucket,
            count(e.id) filter (where e.kind = 'pageview') as pageviews,
            count(distinct e.visitor) filter (where e.kind = 'pageview') as visitors,
            count(e.id) filter (where e.name = 'resume-download') as resume,
            count(e.id) filter (where e.name = 'video-play') as videos,
            count(e.id) filter (where e.name = 'itch-click') as itch,
            count(e.id) filter (where e.name in (${CONTACT})) as contact
     from b left join stats_events e
       on e.ts > now() - $1::interval and date_trunc($3, e.ts at time zone $2) = b.bucket
     group by b.bucket order by b.bucket`,
    [iv, tz, range.bucket],
  );

  const top = (col, limit = 8) =>
    c.query(
      `select ${col} as label, count(distinct visitor) as visitors, count(*) as hits
       from stats_events where ${W} and kind = 'pageview'
       group by 1 order by 2 desc, 3 desc limit ${limit}`,
      [iv],
    );

  const [pages, countries, cities, devices, browsers, oses, sources, events, hours, funnel, live, visits] = await Promise.all([
    top('path'),
    top(`coalesce(country, '??')`),
    top(`coalesce(city, 'Unknown') || '|' || coalesce(country, '??')`, 6),
    top(`coalesce(device, 'Unknown')`),
    top(`coalesce(browser, 'Unknown')`, 6),
    top(`coalesce(os, 'Unknown')`, 6),
    c.query(
      `select coalesce(src, 'Direct') as label, count(*) as visitors from (
         select (array_agg(coalesce(nullif(utm_source, ''), referrer) order by ts)
                   filter (where coalesce(nullif(utm_source, ''), referrer) is not null))[1] as src
         from stats_events where ${W} and kind = 'pageview'
         group by visitor, date_trunc('day', ts)) v
       group by 1 order by 2 desc limit 8`,
      [iv],
    ),
    c.query(
      `select name, coalesce(props->>'game', props->>'project', props->>'from', '') as detail, count(*) as n
       from stats_events where ${W} and kind = 'event' group by 1, 2 order by 3 desc limit 12`,
      [iv],
    ),
    c.query(
      `select extract(hour from ts at time zone $2)::int as h, count(distinct visitor) as visitors
       from stats_events where ${W} and kind = 'pageview' group by 1`,
      [iv, tz],
    ),
    c.query(
      `select count(distinct visitor) filter (where kind = 'pageview') as all_v,
              count(distinct visitor) filter (where kind = 'pageview' and path like '/projects/%') as project_v,
              count(distinct visitor) filter (where kind = 'event' and name in ('video-play', 'screenshot-open', 'itch-click')) as media_v,
              count(distinct visitor) filter (where kind = 'event' and (name = 'resume-download' or name in (${CONTACT}))) as contact_v
       from stats_events where ${W}`,
      [iv],
    ),
    c.query(
      `select path, count(distinct visitor) as visitors from stats_events
       where ts > now() - interval '5 minutes' and kind = 'pageview' group by 1 order by 2 desc limit 6`,
    ),
    c.query(
      `select min(ts) as first_ts, max(ts) as last_ts,
              max(country) as country, max(city) as city, max(device) as device, max(browser) as browser, max(os) as os,
              (array_agg(coalesce(nullif(utm_source, ''), referrer) order by ts)
                 filter (where kind = 'pageview' and coalesce(nullif(utm_source, ''), referrer) is not null))[1] as source,
              array_agg(path order by ts) filter (where kind = 'pageview') as pages,
              array_agg(name || coalesce(':' || coalesce(props->>'game', props->>'project', props->>'from'), '') order by ts)
                filter (where kind = 'event') as events,
              coalesce(sum(duration) filter (where kind = 'pageview'), 0) as seconds
       from stats_events where ${W}
       group by visitor, date_trunc('day', ts at time zone $2)
       order by max(ts) desc limit 30`,
      [iv, tz],
    ),
  ]);

  const nums = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, n(v)]));
  const byHour = Array.from({ length: 24 }, (_, h) => n(hours.find((r) => n(r.h) === h)?.visitors));
  return {
    kpi: nums(kpi),
    prev: nums(prev),
    series: series.map((r) => ({ ...nums(r), bucket: new Date(`${r.bucket}Z`) })),
    pages, countries, cities, devices, browsers, oses, sources, events, visits,
    hours: byHour,
    funnel: nums(funnel[0]),
    live: live.map((r) => ({ path: r.path, visitors: n(r.visitors) })),
  };
}

/* ================================================================ helpers */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = (v) => new Intl.NumberFormat('en-US').format(Number(v) || 0);
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (code) => {
  if (!code || code === '??') return 'Unknown';
  try { return regionNames.of(code) || code; } catch { return code; }
};
const duration = (s) => {
  s = Math.round(Number(s) || 0);
  if (!s) return '0s';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const titleCase = (slug) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const pageName = (p) => {
  if (p === '/') return 'Home';
  if (p === '/arcade') return 'Arcade';
  const m = /^\/projects\/([^/?#]+)/.exec(p || '');
  return m ? PROJECT_NAMES[m[1]] || titleCase(m[1]) : p;
};
const pageKind = (p) => (p === '/' ? 'Home page' : /^\/projects\//.test(p || '') ? 'Case study' : p === '/arcade' ? 'Mini-game' : 'Page');
const SOURCE_NAMES = [
  [/linkedin|lnkd\.in/, 'LinkedIn'], [/google\./, 'Google'], [/github/, 'GitHub'], [/itch\.io/, 'itch.io'],
  [/^t\.co$|twitter|x\.com/, 'X / Twitter'], [/facebook|fb\./, 'Facebook'], [/instagram/, 'Instagram'],
  [/bing\./, 'Bing'], [/duckduckgo/, 'DuckDuckGo'], [/whatsapp|wa\.me/, 'WhatsApp'], [/youtube/, 'YouTube'],
];
const sourceName = (s) => {
  if (!s || s === 'Direct') return 'Direct';
  for (const [re, name] of SOURCE_NAMES) if (re.test(s)) return name;
  return s;
};
const hue = (s) => [...String(s)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);

function ago(date, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(date).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

function deltaPill(now, before, invert = false) {
  if (!now && !before) return '<span class="pill flat">no data yet</span>';
  if (!before) return '<span class="pill up">new</span>';
  const p = Math.round(((now - before) / before) * 100);
  if (!p) return '<span class="pill flat">same</span>';
  const good = invert ? p < 0 : p > 0;
  return `<span class="pill ${good ? 'up' : 'down'}">${icon(p > 0 ? 'up' : 'down', 12)}${Math.abs(p)}%</span>`;
}

/* --------------------------------------------------------------- icons */
const ICONS = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  bounce: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  play: '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>',
  game: '<path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  desktop: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  mobile: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  tablet: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/>',
  vr: '<path d="M3 8h18a1 1 0 0 1 1 1v6a2 2 0 0 1-2 2h-4l-2-3-2 3H6a2 2 0 0 1-2-2V9"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  funnel: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
};
const icon = (name, size = 18) =>
  `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const deviceIcon = (d) => icon(d === 'Mobile' ? 'mobile' : d === 'Tablet' ? 'tablet' : d === 'VR headset' ? 'vr' : 'desktop', 18);

/* --------------------------------------------------------------- charts */

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smooth(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function sparkline(values, id) {
  const W = 120, H = 36;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const pts = values.map((v, i) => [i * step, H - 3 - ((H - 6) * v) / max]);
  const line = smooth(pts);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="sg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
    <path d="${line} L${W},${H} L0,${H} Z" fill="url(#sg${id})"/><path d="${line}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

/** Axis maximum split into 4 whole-number steps (4, 8, 20, 40, 100…). */
function niceMax(v) {
  const raw = Math.max(1, v / 4);
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((x) => x >= raw && Number.isInteger(x)) ?? 10 * p;
  return step * 4;
}

function trafficChart(series, bucket) {
  const W = 960, H = 300, L = 44, R = 12, T = 16, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const max = niceMax(Math.max(...series.map((s) => s.pageviews), 1));
  const nPts = series.length;
  const x = (i) => L + (nPts > 1 ? (iw * i) / (nPts - 1) : iw / 2);
  const y = (v) => T + ih - (ih * v) / max;
  const fmtX = new Intl.DateTimeFormat('en-GB', bucket === 'hour' ? { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fmtTip = new Intl.DateTimeFormat('en-GB', bucket === 'hour' ? { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' } : { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  let grid = '';
  for (let k = 0; k <= 4; k++) {
    const v = (max / 4) * k;
    grid += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="gl"/>
             <text x="${L - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="ax">${fmt(Math.round(v))}</text>`;
  }
  const vPts = series.map((s, i) => [x(i), y(s.visitors)]);
  const pPts = series.map((s, i) => [x(i), y(s.pageviews)]);
  const vLine = smooth(vPts), pLine = smooth(pPts);
  const every = Math.max(1, Math.ceil(nPts / 8));
  let labels = '', hovers = '';
  const colW = nPts > 1 ? iw / (nPts - 1) : iw;
  series.forEach((s, i) => {
    if (i % every === 0 || i === nPts - 1) labels += `<text x="${x(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="ax">${esc(fmtX.format(s.bucket))}</text>`;
    hovers += `<g class="hv"><rect x="${(x(i) - colW / 2).toFixed(1)}" y="${T}" width="${colW.toFixed(1)}" height="${ih}" fill="transparent"/>
      <line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${T}" y2="${T + ih}" class="guide"/>
      <circle cx="${x(i).toFixed(1)}" cy="${y(s.visitors).toFixed(1)}" r="5" class="dot"/>
      <title>${esc(fmtTip.format(s.bucket))}: ${s.visitors} visitor${s.visitors === 1 ? '' : 's'}, ${s.pageviews} page view${s.pageviews === 1 ? '' : 's'}</title></g>`;
  });
  const base = T + ih;
  return `<svg class="traffic" viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitors and page views over time">
    <defs>
      <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a274ff" stop-opacity=".55"/><stop offset="1" stop-color="#a274ff" stop-opacity="0"/></linearGradient>
      <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#67e8f9" stop-opacity=".16"/><stop offset="1" stop-color="#67e8f9" stop-opacity="0"/></linearGradient>
    </defs>
    ${grid}
    <path d="${pLine} L${x(nPts - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z" fill="url(#gp)"/>
    <path d="${pLine}" fill="none" stroke="#67e8f9" stroke-width="2" stroke-dasharray="5 5" opacity=".8"/>
    <path d="${vLine} L${x(nPts - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z" fill="url(#gv)"/>
    <path d="${vLine}" fill="none" stroke="#b892ff" stroke-width="3"/>
    ${labels}${hovers}
  </svg>`;
}

function donut(rows) {
  const total = rows.reduce((a, r) => a + (Number(r.visitors) || 0), 0);
  const colors = ['#a274ff', '#67e8f9', '#f472b6', '#fbbf24', '#4ade80'];
  const C = 2 * Math.PI * 42;
  let offset = 0, arcs = '', legend = '';
  rows.slice(0, 5).forEach((r, i) => {
    const v = Number(r.visitors) || 0;
    const len = total ? (C * v) / total : 0;
    arcs += `<circle r="42" cx="60" cy="60" fill="none" stroke="${colors[i]}" stroke-width="14" stroke-dasharray="${Math.max(0, len - 2).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 60 60)"/>`;
    offset += len;
    legend += `<li><span class="sw" style="background:${colors[i]}"></span>${deviceIcon(r.label)}<span class="l">${esc(r.label)}</span><span class="n">${pct(v, total)}%</span></li>`;
  });
  return `<div class="donut"><svg viewBox="0 0 120 120" aria-hidden="true"><circle r="42" cx="60" cy="60" fill="none" stroke="rgba(239,234,247,.06)" stroke-width="14"/>${arcs}
      <text x="60" y="58" text-anchor="middle" class="dn">${fmt(total)}</text><text x="60" y="76" text-anchor="middle" class="dl">visitors</text></svg>
    <ul class="legend">${legend || '<li class="muted">No data yet</li>'}</ul></div>`;
}

function hoursChart(hours) {
  const max = Math.max(1, ...hours);
  const peak = hours.indexOf(Math.max(...hours));
  const bars = hours
    .map((v, h) => `<div class="hb${h === peak && v ? ' peak' : ''}" style="--h:${Math.max(4, Math.round((100 * v) / max))}%" title="${String(h).padStart(2, '0')}:00 · ${v} visitor${v === 1 ? '' : 's'}"><i></i></div>`)
    .join('');
  return `<div class="hours">${bars}</div><div class="hours-ax"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
    <p class="hint">${hours.some(Boolean) ? `Busiest around <b>${String(peak).padStart(2, '0')}:00</b>` : 'No visits yet'}</p>`;
}

function barRows(rows, { label = (r) => r.label, lead = () => '', total } = {}) {
  if (!rows.length) return '<p class="muted pad">No data yet</p>';
  const sum = total ?? rows.reduce((a, r) => a + (Number(r.visitors) || 0), 0);
  const max = Math.max(1, ...rows.map((r) => Number(r.visitors) || 0));
  return `<ul class="bars">${rows
    .map((r) => {
      const v = Number(r.visitors) || 0;
      return `<li><span class="fill" style="width:${Math.round((100 * v) / max)}%"></span>
        <span class="lead">${lead(r)}</span><span class="l">${label(r)}</span>
        <span class="n">${fmt(v)}</span><span class="p">${pct(v, sum)}%</span></li>`;
    })
    .join('')}</ul>`;
}

/* ================================================================ render */

function render({ key, range, tz, data }) {
  const { kpi, prev, series, funnel } = data;
  const now = Date.now();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(new Date()));
  const greet = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const liveN = data.live.reduce((a, r) => a + r.visitors, 0);
  const col = (k) => series.map((s) => s[k] || 0);
  const tabs = Object.entries(RANGES)
    .map(([k, r]) => `<a href="?range=${k}"${k === key ? ' aria-current="page"' : ''}>${esc(r.short)}</a>`)
    .join('');

  const bounceRate = pct(kpi.bounces, kpi.visits);
  const prevBounce = pct(prev.bounces, prev.visits);
  const kpiCard = (id, ic, label, value, deltaHtml, spark, tone = '') =>
    `<article class="card kpi ${tone}"><div class="kpi-top"><span class="kicon">${icon(ic)}</span><span class="klabel">${label}</span>${deltaHtml}</div>
      <div class="kval display">${value}</div>${spark ? sparkline(spark, id) : ''}</article>`;

  const hero = [
    kpiCard('v', 'users', 'Visitors', fmt(kpi.visitors), deltaPill(kpi.visitors, prev.visitors), col('visitors')),
    kpiCard('p', 'eye', 'Page views', fmt(kpi.pageviews), deltaPill(kpi.pageviews, prev.pageviews), col('pageviews'), 'cyan'),
    kpiCard('t', 'clock', 'Avg. visit', duration(kpi.avg_visit), deltaPill(kpi.avg_visit, prev.avg_visit), null, 'pink'),
    kpiCard('b', 'bounce', 'Bounce rate', `${bounceRate}<small>%</small>`, kpi.visits ? deltaPill(bounceRate, prevBounce, true) : '<span class="pill flat">no data yet</span>', null, 'amber'),
  ].join('');

  const signal = (id, ic, label, value, prevValue, key2) =>
    `<article class="card signal"><span class="sicon">${icon(ic, 20)}</span><div><div class="sval display">${fmt(value)}</div><div class="slabel">${label}</div></div>
      ${deltaPill(value, prevValue)}${sparkline(col(key2), id)}</article>`;
  const signals = [
    signal('r', 'file', 'Résumé downloads', kpi.resume, prev.resume, 'resume'),
    signal('c', 'mail', 'Contact clicks', kpi.contact, prev.contact, 'contact'),
    signal('vp', 'play', 'Video plays', kpi.videos, prev.videos, 'videos'),
    signal('i', 'game', 'itch.io clicks', kpi.itch, prev.itch, 'itch'),
  ].join('');

  const steps = [
    ['Visited the site', funnel.all_v],
    ['Opened a case study', funnel.project_v],
    ['Watched or played', funnel.media_v],
    ['Résumé or contact', funnel.contact_v],
  ];
  const funnelHtml = steps
    .map(([label, v], i) => `<li style="--w:${funnel.all_v ? Math.max(6, pct(v, funnel.all_v)) : 0}%">
        <div class="fhead"><span class="fstep">0${i + 1}</span><span class="flabel">${label}</span><span class="fval">${fmt(v)}</span><span class="fpct">${i ? `${pct(v, funnel.all_v)}%` : ''}</span></div>
        <div class="ftrack"><span></span></div></li>`)
    .join('');

  const pagesHtml = barRows(data.pages, {
    label: (r) => `${esc(pageName(r.label))}<small>${esc(pageKind(r.label))}</small>`,
    lead: (r) => `<span class="dotc" style="--c:hsl(${hue(r.label)} 80% 72%)"></span>`,
  });
  const sourcesHtml = barRows(data.sources, {
    label: (r) => `${esc(sourceName(r.label))}${sourceName(r.label) !== r.label && r.label !== 'Direct' ? `<small>${esc(r.label)}</small>` : ''}`,
    lead: (r) => `<span class="ava" style="--c:hsl(${hue(sourceName(r.label))} 70% 70%)">${esc(sourceName(r.label).charAt(0))}</span>`,
  });
  const countriesHtml = barRows(data.countries, {
    label: (r) => esc(countryName(r.label)),
    lead: (r) => `<span class="cc">${esc(r.label === '??' ? '–' : r.label)}</span>`,
  });
  const citiesHtml = barRows(data.cities, {
    label: (r) => { const [city, cc] = String(r.label).split('|'); return `${esc(city)}<small>${esc(countryName(cc))}</small>`; },
    lead: () => `<span class="pinc">${icon('pin', 14)}</span>`,
  });
  const techHtml = (rows) =>
    rows.length ? `<ul class="techs">${rows.map((r) => `<li><span>${esc(r.label)}</span><b>${fmt(r.visitors)}</b></li>`).join('')}</ul>` : '<p class="muted">No data yet</p>';

  const eventsHtml = data.events.length
    ? `<ul class="events">${data.events
        .map((e) => {
          const meta = EVENTS[e.name] || { label: e.name, icon: 'bolt' };
          return `<li><span class="eicon">${icon(meta.icon, 16)}</span><span class="l">${esc(meta.label)}${e.detail ? `<small>${esc(e.detail)}</small>` : ''}</span><span class="n">${fmt(e.n)}</span></li>`;
        })
        .join('')}</ul>`
    : '<p class="muted pad">Nobody clicked anything yet in this period.</p>';

  const when = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz });
  const visitsHtml = data.visits.length
    ? data.visits
        .map((v) => {
          const place = v.city ? `${v.city}` : countryName(v.country);
          const sub = v.city ? countryName(v.country) : '';
          const pages = (v.pages || []).map((p) => `<li>${esc(pageName(p))}</li>`).join('');
          const evs = (v.events || [])
            .map((e) => {
              const [name, detail] = String(e).split(':');
              const meta = EVENTS[name] || { label: name, icon: 'bolt' };
              return `<span class="echip">${icon(meta.icon, 13)}${esc(meta.label)}${detail ? ` · ${esc(detail)}` : ''}</span>`;
            })
            .join('');
          const hot = (v.events || []).some((e) => /^(resume-download|email-|linkedin-)/.test(e));
          return `<li class="visit${hot ? ' hot' : ''}">
            <span class="vava">${deviceIcon(v.device)}</span>
            <div class="vbody">
              <div class="vtop"><strong>${esc(place)}</strong>${sub ? `<span class="vsub">${esc(sub)}</span>` : ''}${v.country && v.country !== '??' ? `<span class="cc">${esc(v.country)}</span>` : ''}
                ${hot ? '<span class="tag-hot">Interested</span>' : ''}
                <time title="${esc(when.format(new Date(v.first_ts)))}">${esc(ago(v.last_ts, now))}</time></div>
              <div class="vmeta"><span>${esc(v.device || '?')} · ${esc(v.browser || '?')} · ${esc(v.os || '?')}</span><span class="src">via <b>${esc(sourceName(v.source || 'Direct'))}</b></span><span>${icon('clock', 13)} ${duration(v.seconds)}</span></div>
              ${pages ? `<ol class="vpath">${pages}</ol>` : ''}
              ${evs ? `<div class="vevents">${evs}</div>` : ''}
            </div></li>`;
        })
        .join('')
    : `<li class="empty-visits"><span>${icon('users', 28)}</span><p>No visits in this period yet.<br/>They show up here a few seconds after someone opens your site.</p></li>`;

  const liveHtml = liveN
    ? `<ul class="livelist">${data.live.map((r) => `<li><span>${esc(pageName(r.path))}</span><b>${r.visitors}</b></li>`).join('')}</ul>`
    : '<p class="muted">Nobody on the site right now.</p>';

  const body = `
  <div class="glow" aria-hidden="true"></div>
  <header class="top"><div class="wrap topbar">
    <a class="brand" href="?range=${key}"><span class="logo display">S</span><span><b>Portfolio stats</b><small>Private · only you can see this page</small></span></a>
    <nav class="seg" aria-label="Time range">${tabs}</nav>
    <div class="actions">
      <a class="iconbtn" href="?range=${key}" title="Refresh">${icon('refresh', 18)}<span>Refresh</span></a>
      <a class="iconbtn ghost" href="/api/auth/logout" title="Sign out">${icon('logout', 18)}<span>Sign out</span></a>
    </div></div></header>

  <main class="wrap">
    <section class="intro">
      <div><p class="eyebrow">${esc(greet)}, Selim</p><h1 class="display">Last ${esc(range.label)}</h1></div>
      <div class="livebox${liveN ? ' on' : ''}"><span class="pulse"></span><span class="display">${fmt(liveN)}</span><span>on your site<br/>right now</span></div>
    </section>

    <section class="kpis">${hero}</section>
    <section class="signals">${signals}</section>

    <section class="grid g-main">
      <article class="card chart-card">
        <header class="ch"><h2>Traffic</h2><div class="keys"><span><i class="kv"></i>Visitors</span><span><i class="kp"></i>Page views</span></div></header>
        <div class="scrollx">${trafficChart(series, range.bucket)}</div>
      </article>
      <article class="card">
        <header class="ch"><h2>${icon('funnel', 16)} Recruiter funnel</h2></header>
        <ol class="funnel">${funnelHtml}</ol>
        <p class="hint">Share of visitors who went one step further.</p>
      </article>
    </section>

    <section class="grid g-2">
      <article class="card"><header class="ch"><h2>Most viewed</h2><span class="sub">visitors</span></header>${pagesHtml}</article>
      <article class="card"><header class="ch"><h2>Where they came from</h2><span class="sub">visits</span></header>${sourcesHtml}</article>
    </section>

    <section class="grid g-3">
      <article class="card"><header class="ch"><h2>${icon('globe', 16)} Countries</h2></header>${countriesHtml}</article>
      <article class="card"><header class="ch"><h2>${icon('pin', 16)} Cities</h2></header>${citiesHtml}</article>
      <article class="card"><header class="ch"><h2>Devices</h2></header>${donut(data.devices)}
        <div class="tech2"><div><h3>Browsers</h3>${techHtml(data.browsers)}</div><div><h3>Systems</h3>${techHtml(data.oses)}</div></div></article>
    </section>

    <section class="grid g-2b">
      <article class="card"><header class="ch"><h2>What people clicked</h2><span class="sub">times</span></header>${eventsHtml}</article>
      <article class="card"><header class="ch"><h2>When people visit</h2><span class="sub">${esc(tz)}</span></header>${hoursChart(data.hours)}
        <div class="livewrap"><h3><span class="pulse sm"></span>Right now</h3>${liveHtml}</div></article>
    </section>

    <section class="card visits-card"><header class="ch"><h2>Recent visits</h2><span class="sub">newest first · one card per visitor per day</span></header>
      <ol class="visits">${visitsHtml}</ol></section>

    <footer class="foot">Anonymous & cookie-free · bots, test deployments and your own signed-in visits aren’t counted · times in ${esc(tz)}</footer>
  </main>`;
  return page('Portfolio stats', body);
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="dark"><title>${esc(title)}</title>
<style>@font-face{font-family:Anton;src:url(data:font/woff2;base64,${ANTON_WOFF2}) format("woff2");font-display:swap}${CSS}</style></head><body>${body}</body></html>`;
}

const CSS = `
:root{--bg:#0d0b12;--bg2:#13101a;--card:#17141f;--card2:#1d1927;--line:rgba(239,234,247,.08);--line2:rgba(239,234,247,.14);
--fg:#f3effa;--muted:#aaa2bb;--subtle:#7f7891;--ac:#a274ff;--ac2:#b892ff;--cyan:#67e8f9;--pink:#f472b6;--amber:#fbbf24;--good:#4ade80;--bad:#fb7185;--ink:#13091f;
--r:18px;--font:"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,Roboto,"Helvetica Neue",sans-serif}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 var(--font);-webkit-font-smoothing:antialiased;min-height:100vh}
a{color:inherit;text-decoration:none}h1,h2,h3,p{margin:0}.display{font-family:Anton,Impact,sans-serif;font-weight:400;letter-spacing:.01em}
.wrap{width:min(1320px,100% - 40px);margin-inline:auto}
.glow{position:fixed;inset:-30vh -10vw auto;height:70vh;pointer-events:none;z-index:0;
 background:radial-gradient(40% 60% at 20% 30%,rgba(162,116,255,.18),transparent 70%),radial-gradient(35% 50% at 85% 10%,rgba(103,232,249,.08),transparent 70%)}
.top,main{position:relative;z-index:1}
.top{position:sticky;top:0;z-index:5;background:rgba(13,11,18,.72);backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px) saturate(1.3);border-bottom:1px solid var(--line)}
.topbar{display:flex;align-items:center;gap:16px;min-height:68px;flex-wrap:wrap;padding-block:10px}
.brand{display:flex;align-items:center;gap:12px;margin-right:auto}.brand b{display:block;font-size:15px}.brand small{display:block;color:var(--subtle);font-size:12px}
.logo{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#b892ff,#7c4dff);color:var(--ink);font-size:22px;box-shadow:0 8px 24px -8px rgba(162,116,255,.8)}
.seg{display:flex;gap:2px;padding:4px;border-radius:999px;background:var(--card);border:1px solid var(--line)}
.seg a{padding:7px 14px;border-radius:999px;color:var(--muted);font-size:13px;font-weight:600;transition:background .2s,color .2s}
.seg a:hover{color:var(--fg)}.seg a[aria-current]{background:var(--fg);color:var(--bg)}
.actions{display:flex;gap:8px}
.iconbtn{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border-radius:999px;background:var(--ac);color:var(--ink);font-weight:600;font-size:14px;transition:background .2s}
.iconbtn:hover{background:var(--ac2)}.iconbtn.ghost{background:transparent;color:var(--fg);border:1px solid var(--line2)}.iconbtn.ghost:hover{background:var(--card)}
.intro{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:34px 0 22px;flex-wrap:wrap}
.eyebrow{color:var(--muted);font-size:14px;margin-bottom:6px}.intro h1{font-size:clamp(40px,6vw,72px);line-height:.95;text-transform:uppercase}
.livebox{display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:16px;background:var(--card);border:1px solid var(--line);color:var(--muted);font-size:13px;line-height:1.25}
.livebox .display{font-size:34px;color:var(--fg);line-height:1}.livebox.on{border-color:rgba(74,222,128,.35)}
.pulse{position:relative;width:10px;height:10px;border-radius:50%;background:var(--subtle);flex:none}.pulse.sm{width:8px;height:8px}
.on .pulse,.livewrap .pulse{background:var(--good)}
@media (prefers-reduced-motion:no-preference){.on .pulse::after{content:"";position:absolute;inset:-5px;border-radius:50%;border:2px solid var(--good);animation:ping 1.8s ease-out infinite}}
@keyframes ping{from{opacity:.9;transform:scale(.5)}to{opacity:0;transform:scale(1.8)}}
.card{position:relative;background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--line);border-radius:var(--r);padding:20px;min-width:0;overflow:hidden}
.card::before{content:"";position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.kpi{--tone:var(--ac2);display:grid;gap:6px;padding-bottom:0}
.kpi.cyan{--tone:var(--cyan)}.kpi.pink{--tone:var(--pink)}.kpi.amber{--tone:var(--amber)}
.kpi-top{display:flex;align-items:center;gap:10px}.kicon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:color-mix(in oklab,var(--tone) 16%,transparent);color:var(--tone)}
.klabel{color:var(--muted);font-size:14px;font-weight:600;margin-right:auto}
.kval{font-size:clamp(40px,4vw,56px);line-height:1;margin-top:6px}.kval small{font-size:.5em;color:var(--muted);margin-left:2px}
.spark{display:block;width:calc(100% + 40px);height:44px;margin:4px -20px 0;color:var(--tone)}
.kpi:not(:has(.spark)){padding-bottom:20px}
.pill{display:inline-flex;align-items:center;gap:2px;padding:3px 8px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}
.pill.up{background:rgba(74,222,128,.12);color:var(--good)}.pill.down{background:rgba(251,113,133,.12);color:var(--bad)}.pill.flat{background:rgba(239,234,247,.06);color:var(--subtle);font-weight:600}
.signals{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:14px}
.signal{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding:16px 18px 0;--tone:var(--ac2)}
.signal .spark{grid-column:1/-1;height:30px;opacity:.85}
.sicon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:rgba(162,116,255,.14);color:var(--ac2)}
.sval{font-size:32px;line-height:1}.slabel{color:var(--muted);font-size:13px;margin-top:2px}
.grid{display:grid;gap:14px;margin-top:14px}
.g-main{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}.g-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.g-3{grid-template-columns:repeat(3,minmax(0,1fr))}.g-2b{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}
.ch{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.ch h2{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700}.ch h2 .i{color:var(--ac2)}.sub{color:var(--subtle);font-size:12px}
.keys{display:flex;gap:14px;color:var(--muted);font-size:12px}.keys i{display:inline-block;width:18px;height:3px;border-radius:2px;margin-right:6px;vertical-align:middle}
.kv{background:var(--ac2)}.kp{background:repeating-linear-gradient(90deg,var(--cyan) 0 4px,transparent 4px 7px)}
.scrollx{overflow-x:auto;margin-inline:-6px;padding-inline:6px;scrollbar-width:thin}.traffic{display:block;width:100%;min-width:600px;height:auto}.traffic .gl{stroke:rgba(239,234,247,.07)}.traffic .ax{fill:var(--subtle);font-size:11px;font-family:var(--font)}
.traffic .guide{stroke:rgba(239,234,247,.25);stroke-dasharray:3 4;opacity:0}.traffic .dot{fill:var(--bg);stroke:var(--ac2);stroke-width:3;opacity:0}
.traffic .hv:hover .guide,.traffic .hv:hover .dot{opacity:1}
.funnel{list-style:none;margin:4px 0 0;padding:0;display:grid;gap:16px}
.fhead{display:flex;align-items:baseline;gap:10px;margin-bottom:7px}.fstep{font-size:11px;color:var(--subtle);font-weight:700}
.flabel{font-weight:600;margin-right:auto;font-size:14px}.fval{font-family:Anton,Impact,sans-serif;font-size:20px}.fpct{color:var(--ac2);font-weight:700;font-size:13px;min-width:38px;text-align:right}
.ftrack{height:10px;border-radius:999px;background:rgba(239,234,247,.06);overflow:hidden}
.ftrack span{display:block;height:100%;width:var(--w);border-radius:inherit;background:linear-gradient(90deg,#7c4dff,#b892ff 60%,#67e8f9)}
.hint{color:var(--subtle);font-size:12px;margin-top:14px}.hint b{color:var(--fg)}
.bars{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.bars li{position:relative;display:grid;grid-template-columns:auto 1fr auto 44px;align-items:center;gap:12px;padding:9px 12px;border-radius:12px;overflow:hidden}
.bars .fill{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,rgba(162,116,255,.20),rgba(162,116,255,.06));border-radius:inherit;z-index:0}
.bars li>*:not(.fill){position:relative;z-index:1}
.bars .l{font-weight:600;font-size:14px;overflow-wrap:anywhere;line-height:1.25}.bars small,.events small{display:block;color:var(--subtle);font-size:12px;font-weight:400}
.bars .n{font-variant-numeric:tabular-nums;font-weight:700}.bars .p{color:var(--subtle);font-size:12px;text-align:right;font-variant-numeric:tabular-nums}
.dotc{display:block;width:10px;height:10px;border-radius:3px;background:var(--c)}
.ava{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:color-mix(in oklab,var(--c) 22%,transparent);color:var(--c);font-weight:800;font-size:13px}
.cc{display:inline-grid;place-items:center;min-width:30px;height:22px;padding:0 6px;border-radius:6px;background:rgba(239,234,247,.08);color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.06em}
.pinc{color:var(--pink);display:grid}
.donut{display:grid;grid-template-columns:120px 1fr;gap:16px;align-items:center}
.donut>svg{width:120px;height:120px}.donut .dn{fill:var(--fg);font-family:Anton,Impact,sans-serif;font-size:24px}.donut .dl{fill:var(--subtle);font-size:10px;font-family:var(--font)}
.legend{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.legend li{display:grid;grid-template-columns:auto auto 1fr auto;align-items:center;gap:8px;font-size:14px}.legend .i{color:var(--muted)}
.sw{width:10px;height:10px;border-radius:3px}.legend .n{font-weight:700}
.tech2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
.tech2 h3,.livewrap h3{font-size:12px;color:var(--subtle);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.techs{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:14px}.techs li{display:flex;justify-content:space-between;gap:8px}.techs b{font-variant-numeric:tabular-nums}
.events{list-style:none;margin:0;padding:0;display:grid}
.events li{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:10px 4px;border-bottom:1px solid var(--line)}.events li:last-child{border:0}
.eicon{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:rgba(162,116,255,.12);color:var(--ac2)}
.events .l{font-weight:600;font-size:14px}.events .n{font-family:Anton,Impact,sans-serif;font-size:20px}
.hours{display:grid;grid-template-columns:repeat(24,1fr);gap:3px;align-items:end;height:120px}
.hb{height:100%;display:flex;align-items:flex-end}.hb i{display:block;width:100%;height:var(--h);border-radius:4px 4px 2px 2px;background:rgba(162,116,255,.35)}
.hb.peak i{background:linear-gradient(180deg,#67e8f9,#a274ff)}.hb:hover i{background:var(--ac2)}
.hours-ax{display:flex;justify-content:space-between;color:var(--subtle);font-size:11px;margin-top:6px}
.livewrap{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
.livelist{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:14px}.livelist li{display:flex;justify-content:space-between}
.visits-card{margin-top:14px}.visits{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.visit{display:grid;grid-template-columns:auto 1fr;gap:14px;padding:14px 16px;border-radius:14px;background:rgba(239,234,247,.025);border:1px solid var(--line);transition:border-color .2s,background .2s}
.visit:hover{border-color:var(--line2);background:rgba(239,234,247,.04)}
.visit.hot{border-color:rgba(162,116,255,.35);background:linear-gradient(90deg,rgba(162,116,255,.08),transparent 60%)}
.vava{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:rgba(162,116,255,.12);color:var(--ac2)}
.vtop{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.vtop strong{font-size:16px}.vsub{color:var(--muted);font-size:14px}
.vtop time{margin-left:auto;color:var(--subtle);font-size:13px;white-space:nowrap}
.tag-hot{padding:2px 8px;border-radius:999px;background:var(--ac);color:var(--ink);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.vmeta{display:flex;flex-wrap:wrap;gap:4px 14px;color:var(--muted);font-size:13px;margin-top:3px}.vmeta span{display:inline-flex;align-items:center;gap:5px}.vmeta b{color:var(--fg)}
.vpath{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:10px 0 0;padding:0;font-size:13px}
.vpath li{padding:3px 10px;border-radius:8px;background:rgba(239,234,247,.06)}
.vpath li+li::before{content:"→";color:var(--ac2);margin:0 8px 0 -2px;position:relative;left:-6px}
.vevents{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.echip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:rgba(162,116,255,.16);color:var(--fg);font-size:12px;font-weight:600}.echip .i{color:var(--ac2)}
.empty-visits{display:flex;align-items:center;gap:14px;padding:26px;color:var(--subtle)}
.muted{color:var(--subtle);font-size:14px}.pad{padding:8px 4px}
.empty-state{margin-top:40px;display:grid;gap:10px}.empty-state h1{font-size:40px}
code{font-family:ui-monospace,Consolas,monospace;font-size:.9em;color:var(--ac2)}
.foot{color:var(--subtle);font-size:12px;text-align:center;padding:28px 0 44px}
@media (max-width:1100px){.kpis,.signals{grid-template-columns:repeat(2,minmax(0,1fr))}.g-main,.g-3{grid-template-columns:minmax(0,1fr)}}
@media (max-width:760px){.g-2,.g-2b{grid-template-columns:minmax(0,1fr)}.seg{order:3;width:100%;justify-content:space-between}.seg a{flex:1;text-align:center}
 .iconbtn span{display:none}.iconbtn{padding:0 11px}.wrap{width:min(1320px,100% - 24px)}}
@media (max-width:600px){.kpi-top{flex-wrap:wrap;row-gap:8px}.kpi .pill{order:3}.klabel{margin-right:0;flex:1}
 .signals{grid-template-columns:1fr 1fr;gap:10px}.signal{grid-template-columns:auto 1fr;gap:10px;padding:14px 14px 0}.signal .pill{grid-column:1/-1;justify-self:start}
 .sicon{width:36px;height:36px}.sval{font-size:28px}}
@media (max-width:480px){.kpis{grid-template-columns:1fr 1fr;gap:10px}.card{padding:16px}.spark{width:calc(100% + 32px);margin-inline:-16px}.signal .spark{width:calc(100% + 28px);margin-inline:-14px}
 .kval{font-size:36px}.donut{grid-template-columns:96px 1fr}.donut>svg{width:96px;height:96px}.vtop time{margin-left:0;width:100%}}
`;
