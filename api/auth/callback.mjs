// GET /api/auth/callback: GitHub sends you back here. Only ADMIN_GITHUB_ID gets a session; everyone else: 404.
import { callbackUrl } from './login.mjs';
import { cookieName, createSession, env, notFound, readCookie, safeEqual, setCookie } from '../_lib/security.mjs';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const expected = readCookie(request, cookieName(request, 'oauth_state'));
    const clearState = setCookie(request, 'oauth_state', '', 0);
    if (!code || !state || !expected || !safeEqual(state, expected)) return notFound();

    try {
      const tokenRes = await fetch(`${env('GITHUB_OAUTH_BASE') || 'https://github.com'}/login/oauth/access_token`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: env('GITHUB_CLIENT_ID'),
          client_secret: env('GITHUB_CLIENT_SECRET'),
          code,
          redirect_uri: callbackUrl(request),
        }),
      });
      const token = (await tokenRes.json())?.access_token;
      if (!token) return notFound();

      const userRes = await fetch(`${env('GITHUB_API_BASE') || 'https://api.github.com'}/user`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'portfolio-admin' },
      });
      const user = await userRes.json();
      const adminId = env('ADMIN_GITHUB_ID');
      if (!adminId || !user?.id || !safeEqual(String(user.id), adminId)) return notFound();

      const headers = new Headers({ location: '/admin', 'cache-control': 'no-store' });
      headers.append('set-cookie', clearState);
      headers.append('set-cookie', setCookie(request, 'admin', createSession(user.id), 7 * 86400));
      return new Response(null, { status: 302, headers });
    } catch (err) {
      console.error('[admin] sign-in failed', err);
      return notFound();
    }
  },
};
