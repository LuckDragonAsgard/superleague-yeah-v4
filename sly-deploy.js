/**
 * sly-deploy — Cloudflare Worker
 * Secure deploy relay: accepts POST with worker code, pushes to CF API.
 * Deploy this once, then Claude can deploy sly-app autonomously.
 *
 * Endpoints:
 *   POST /deploy/sly-app  — deploy sly-app-v2.js
 *   GET  /health          — liveness check
 */

const CF_ACCOUNT  = 'a6f47c17811ee2f8b6caeb8f38768c20';
const CF_TOKEN    = '<<REDACTED — CF_API_TOKEN from asgard-vault>>';
const KV_NS       = '4f427724561e48f682d4a7c6153d7124';
const DEPLOY_SECRET = '<<REDACTED — set via wrangler secret>>';

const WORKER_NAME = 'sly-app';
const WORKER_FILE = 'sly-app-v2.js';

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  return res;
}

async function deployWorker(code) {
  const BOUNDARY = '----SlyDeployRelay2026';
  const metadata = JSON.stringify({
    main_module: WORKER_FILE,
    compatibility_date: '2024-01-01',
    bindings: [{ type: 'kv_namespace', name: 'SLY_STATIC', namespace_id: KV_NS }]
  });

  const body = [
    `--${BOUNDARY}\r\n`,
    `Content-Disposition: form-data; name="metadata"; filename="metadata.json"\r\n`,
    `Content-Type: application/json\r\n\r\n`,
    metadata, `\r\n`,
    `--${BOUNDARY}\r\n`,
    `Content-Disposition: form-data; name="${WORKER_FILE}"; filename="${WORKER_FILE}"\r\n`,
    `Content-Type: application/javascript+module\r\n\r\n`,
    code, `\r\n`,
    `--${BOUNDARY}--\r\n`
  ].join('');

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/workers/scripts/${WORKER_NAME}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${CF_TOKEN}`,
      'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`
    },
    body
  });

  return resp.json();
}

export default {
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/health') {
      return cors(new Response(JSON.stringify({ status: 'ok', worker: 'sly-deploy' }), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type'
        }
      });
    }

    // Deploy endpoint
    if (url.pathname === '/deploy/sly-app' && req.method === 'POST') {
      // Auth check
      const auth = req.headers.get('Authorization') || '';
      if (auth !== `Bearer ${DEPLOY_SECRET}`) {
        return cors(new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      const code = await req.text();
      if (!code || code.length < 100) {
        return cors(new Response(JSON.stringify({ error: 'Empty or invalid worker code' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      const result = await deployWorker(code);
      const success = result?.success === true;

      return cors(new Response(JSON.stringify({
        success,
        id: result?.result?.id,
        errors: result?.errors
      }), {
        status: success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    return cors(new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
};
