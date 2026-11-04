import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const DAY = 86400;

export function env(name) {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

/** Constant-time string comparison. */
export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function randomToken(bytes = 24) {
  return randomBytes(bytes).toString('base64url');
}

function sign(value) {
  const secret = env('SESSION_SECRET');
  if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function isHttps(request) {
  const proto = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '');
  return proto === 'https';
}

export function cookieName(request, base) {
  // "__Host-" cookies are locked to this exact domain, path "/" and HTTPS.
  return isHttps(request) ? `__Host-${base}` : base;
}

export function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

export function setCookie(request, base, value, maxAge) {
  const attrs = [`${cookieName(request, base)}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (isHttps(request)) attrs.push('Secure');
  return attrs.join('; ');
}

/** Signed session token: base64url(json).signature */
export function createSession(githubId) {
  const payload = Buffer.from(JSON.stringify({ sub: String(githubId), exp: Math.floor(Date.now() / 1000) + 7 * DAY })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** True only for a valid, unexpired session that belongs to ADMIN_GITHUB_ID. */
export function isAdmin(request) {
  try {
    const token = readCookie(request, cookieName(request, 'admin'));
    if (!token) return false;
    const [payload, signature] = token.split('.');
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const adminId = env('ADMIN_GITHUB_ID');
    return Boolean(adminId) && safeEqual(String(data.sub), adminId) && data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

/**
 * Anonymous visitor id: a hash of IP + browser + a secret that changes every day.
 * The IP is never stored, and the id can't be linked across days.
 */
export function visitorHash(request) {
  const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '').split(',')[0].trim();
  const ua = request.headers.get('user-agent') || '';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${env('SESSION_SECRET')}|${day}|${ip}|${ua}`).digest('base64url').slice(0, 22);
}

/** The response every unauthorised request gets: indistinguishable from any missing page. */
export function notFound() {
  return new Response('<!doctype html><title>404</title><h1>404</h1><p>Page not found.</p>', {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
}
