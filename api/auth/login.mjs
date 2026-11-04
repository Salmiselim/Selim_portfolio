// GET /api/auth/login?k=<ADMIN_LOGIN_KEY>: starts the GitHub sign-in. Without the right key: 404.
import { env, isHttps, notFound, randomToken, safeEqual, setCookie } from '../_lib/security.mjs';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const key = env('ADMIN_LOGIN_KEY');
    const clientId = env('GITHUB_CLIENT_ID');
    if (!key || !clientId || !safeEqual(url.searchParams.get('k') || '', key)) return notFound();

    const state = randomToken();
    const authorize = new URL(`${env('GITHUB_OAUTH_BASE') || 'https://github.com'}/login/oauth/authorize`);
    authorize.searchParams.set('client_id', clientId);
    authorize.searchParams.set('redirect_uri', callbackUrl(request));
    authorize.searchParams.set('state', state);
    authorize.searchParams.set('allow_signup', 'false');

    return new Response(null, {
      status: 302,
      headers: {
        location: authorize.toString(),
        'set-cookie': setCookie(request, 'oauth_state', state, 600),
        'cache-control': 'no-store',
      },
    });
  },
};

export function callbackUrl(request) {
  const base = env('PUBLIC_BASE_URL');
  if (base) return `${base.replace(/\/$/, '')}/api/auth/callback`;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return `${isHttps(request) ? 'https' : 'http'}://${host}/api/auth/callback`;
}
