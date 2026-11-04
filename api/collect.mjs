// POST /api/collect: receives anonymous page views, time-on-page and click events from the site.
import { db } from './_lib/db.mjs';
import { env, isAdmin, visitorHash } from './_lib/security.mjs';
import { isBot, parseUA } from './_lib/ua.mjs';

const EVENT_NAME = /^[a-z0-9][a-z0-9-]{0,39}$/;
const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);
const ok = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export default {
  async fetch(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });

    // Only count real production traffic (not Vercel preview deployments).
    const vercelEnv = env('VERCEL_ENV');
    if (vercelEnv && vercelEnv !== 'production') return ok();

    // Only accept data sent by pages of this same site.
    const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').toLowerCase();
    const origin = request.headers.get('origin') || request.headers.get('referer') || '';
    let originHost = '';
    try { originHost = new URL(origin).host.toLowerCase(); } catch { /* missing or invalid */ }
    if (!host || originHost !== host) return ok();

    const ua = request.headers.get('user-agent') || '';
    if (isBot(ua) || isAdmin(request)) return ok(); // never count bots or you (when signed in)

    const raw = await request.text();
    if (raw.length > 4096) return ok();
    let body;
    try { body = JSON.parse(raw); } catch { return ok(); }
    if (!body || typeof body !== 'object') return ok();

    const path = clip(body.p, 200);
    if (!path || !path.startsWith('/')) return ok();
    const pvId = clip(body.id, 40);

    try {
      const client = await db();

      if (body.t === 'leave') {
        const seconds = Math.max(0, Math.min(3600, Math.round(Number(body.s) || 0)));
        if (pvId && seconds) {
          await client.query(
            `update stats_events set duration = greatest(coalesce(duration, 0), $1)
             where pv_id = $2 and kind = 'pageview' and ts > now() - interval '1 day'`,
            [seconds, pvId],
          );
        }
        return ok();
      }

      const { device, os, browser } = parseUA(ua);
      const city = request.headers.get('x-vercel-ip-city');
      const common = {
        visitor: visitorHash(request),
        country: clip(request.headers.get('x-vercel-ip-country'), 4),
        region: clip(request.headers.get('x-vercel-ip-country-region'), 8),
        city: city ? clip(safeDecode(city), 80) : null,
        lang: clip((request.headers.get('accept-language') || '').split(',')[0], 16),
      };

      if (body.t === 'pageview') {
        let referrer = null;
        try {
          const r = new URL(String(body.r || ''));
          if (r.host.toLowerCase() !== host) referrer = r.hostname.replace(/^www\./, '').slice(0, 100);
        } catch { /* direct visit */ }
        await client.query(
          `insert into stats_events (kind, path, host, referrer, utm_source, visitor, pv_id, country, region, city, device, browser, os, lang)
           values ('pageview', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [path, host, referrer, clip(body.u, 60) || null, common.visitor, pvId, common.country, common.region, common.city, device, browser, os, common.lang],
        );
      } else if (body.t === 'event' && EVENT_NAME.test(String(body.n))) {
        const props = {};
        if (body.d && typeof body.d === 'object') {
          for (const [k, v] of Object.entries(body.d).slice(0, 8)) {
            if (/^[a-z0-9_-]{1,30}$/i.test(k) && ['string', 'number', 'boolean'].includes(typeof v)) props[k] = String(v).slice(0, 100);
          }
        }
        await client.query(
          `insert into stats_events (kind, name, path, host, props, visitor, country, region, city, device, browser, os, lang)
           values ('event', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [body.n, path, host, JSON.stringify(props), common.visitor, common.country, common.region, common.city, device, browser, os, common.lang],
        );
      }

      // Occasionally drop data older than the retention window (default 2 years).
      if (Math.random() < 0.01) {
        const days = Math.max(30, Number(env('STATS_RETENTION_DAYS')) || 730);
        await client.query(`delete from stats_events where ts < now() - make_interval(days => $1)`, [days]);
      }
    } catch (err) {
      console.error('[stats] collect failed', err);
    }
    return ok();
  },
};

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}
