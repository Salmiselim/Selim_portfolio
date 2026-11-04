// Database access for the private stats system (Postgres, e.g. Neon via the Vercel Marketplace).
// Files in api/_lib are helpers, not public endpoints (Vercel ignores names starting with "_").

let clientPromise;

/** @returns {Promise<{ query: (text: string, params?: unknown[]) => Promise<any[]> }>} */
export function db() {
  if (!clientPromise) clientPromise = connect();
  return clientPromise;
}

async function connect() {
  // Tests inject an in-memory database here; production uses Neon over HTTP.
  const injected = /** @type {any} */ (globalThis).__statsDb;
  let client = injected;
  if (!client) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    client = { query: (text, params = []) => sql.query(text, params) };
  }
  await migrate(client);
  return client;
}

async function migrate(client) {
  await client.query(`create table if not exists stats_events (
    id          bigserial primary key,
    ts          timestamptz not null default now(),
    kind        text not null,
    name        text,
    path        text not null,
    host        text,
    referrer    text,
    utm_source  text,
    props       jsonb,
    visitor     text not null,
    pv_id       text,
    duration    integer,
    country     text,
    region      text,
    city        text,
    device      text,
    browser     text,
    os          text,
    lang        text
  )`);
  await client.query(`create index if not exists stats_events_ts on stats_events (ts)`);
  await client.query(`create index if not exists stats_events_kind_ts on stats_events (kind, ts)`);
  await client.query(`create index if not exists stats_events_pv on stats_events (pv_id)`);
}
