// GET /api/auth/logout: ends your admin session.
import { setCookie } from '../_lib/security.mjs';

export default {
  async fetch(request) {
    return new Response(null, {
      status: 302,
      headers: { location: '/', 'set-cookie': setCookie(request, 'admin', '', 0), 'cache-control': 'no-store' },
    });
  },
};
