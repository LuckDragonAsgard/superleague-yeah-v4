// sly-app v5.0 — serves the STANDALONE v4 app from KV
// Mate's reverse proxy is gone; we now serve our own app with all features
// PIN login, chat, auto-pick, auto-draft, trades, etc.

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const p = u.pathname;

    // Block service worker registration
    if (p.includes('service-worker') || (p.includes('sw') && p.endsWith('.js'))) {
      return new Response('', { status: 404 });
    }

    // CORS preflight
    if (p.startsWith('/api/') && req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
    }

    // Bridge /api/login → coach PIN auth via sly-api
    if (p === '/api/login' && req.method === 'POST') {
      try {
        const bd = await req.json().catch(() => ({}));
        const cid = bd.coach_id || bd.coachId || bd.id;
        const pin = String(bd.pin || bd.password || '');
        if (!cid || !pin) return new Response(JSON.stringify({ ok: false, error: 'Missing coach_id or pin' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        const vr = await fetch('https://sly-api.pgallivan.workers.dev/api/coaches/' + cid + '/pin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_pin: pin, new_pin: pin }) });
        const vd = await vr.json();
        if (vd.ok) {
          const cs = await (await fetch('https://sly-api.pgallivan.workers.dev/api/coaches')).json();
          const coach = Array.isArray(cs) ? cs.find(c => String(c.id) === String(cid)) : null;
          return new Response(JSON.stringify({ ok: true, coach }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        return new Response(JSON.stringify({ ok: false, error: vd.error || 'Invalid PIN' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Bridge /api/banter and /api/chat → sly-api/api/messages (legacy compat)
    if ((p === '/api/banter' || p === '/api/chat') && (req.method === 'GET' || req.method === 'POST')) {
      const r = await fetch('https://sly-api.pgallivan.workers.dev/api/messages' + u.search, { method: req.method, headers: req.headers, body: req.method === 'POST' ? req.body : undefined });
      const body = await r.text();
      return new Response(body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // All other /api/* → sly-api
    if (p.startsWith('/api/')) {
      return fetch('https://sly-api.pgallivan.workers.dev' + p + u.search, { method: req.method, headers: req.headers, body: req.body });
    }

    // Serve standalone HTML for any other path (SPA fallback)
    const html = await env.SLY_STATIC.get('standalone-index.html');
    if (!html) return new Response('Standalone HTML not in KV', { status: 500 });
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache'
      }
    });
  }
};
