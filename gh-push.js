// gh-push Worker — pushes files to GitHub + updates kbt-admin KV for live deploy
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
    }
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    let body;
    try { body = await request.json(); } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    const { owner, repo, path, content, message } = body;
    if (!owner || !repo || !path || !content || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: owner, repo, path, content, message' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    const githubResult = await pushToGitHub(owner, repo, path, content, message, env.GITHUB_TOKEN);
    if (!githubResult.ok) {
      return new Response(JSON.stringify({ error: 'GitHub push failed', details: githubResult.error }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    let kvResult = null;
    if (repo === 'kbt-trial' && env.KBT_ADMIN) {
      try {
        const filename = path.split('/').pop();
        const kvKey = filename.replace(/\.[^.]+$/, '').replace(/\./g, '-') || 'index';
        await env.KBT_ADMIN.put(kvKey, content);
        kvResult = { ok: true, key: kvKey };
      } catch (e) { kvResult = { ok: false, error: e.message }; }
    }
    return new Response(JSON.stringify({ success: true, sha: githubResult.sha, kv: kvResult }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
};

async function pushToGitHub(owner, repo, path, content, message, token) {
  const getResp = await fetch('https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path, {
    headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'gh-push-worker/1.0' }
  });
  let sha;
  if (getResp.ok) { const existing = await getResp.json(); sha = existing.sha; }
  const encoded = btoa(unescape(encodeURIComponent(content)));
  const putResp = await fetch('https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path, {
    method: 'PUT',
    headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'gh-push-worker/1.0' },
    body: JSON.stringify({ message, content: encoded, ...(sha && { sha }) })
  });
  if (!putResp.ok) { const err = await putResp.text(); return { ok: false, error: err }; }
  const result = await putResp.json();
  return { ok: true, sha: result.content?.sha };
}