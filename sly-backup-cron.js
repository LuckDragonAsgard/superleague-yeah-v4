// sly-backup-cron — nightly D1 dump → GitHub commit at LuckDragonAsgard/asgard-workers/sly-backups/sly-YYYY-MM-DD.json
// Schedule: 0 16 * * * (16:00 UTC = ~2am AEST next day)

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runBackup(env));
  },
  async fetch(req, env) {
    const r = await runBackup(env);
    return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
  }
};

async function heartbeat(env, status, message) {
  try {
    await fetch('https://sly-api.luckdragon.io/api/cron/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Pin': env.PADDY_PIN || '' },
      body: JSON.stringify({ cron_name: 'sly-backup-cron', status, message })
    });
  } catch (e) {}
}

async function runBackup(env) {
  try {
    // 1. Pull D1 dump from sly-api
    const dumpRes = await fetch('https://sly-api.luckdragon.io/api/_admin/d1-dump', {
      headers: { 'X-Pin': env.PADDY_PIN || '' }
    });
    if (!dumpRes.ok) {
      const err = await dumpRes.text();
      await heartbeat(env, 'err', 'dump fetch ' + dumpRes.status + ': ' + err.slice(0, 100));
      return { ok: false, error: 'dump fetch failed', status: dumpRes.status };
    }
    const dump = await dumpRes.json();

    // 2. Commit to GH at sly-backups/sly-YYYY-MM-DD.json
    const date = new Date().toISOString().slice(0, 10);
    const path = `sly-backups/sly-${date}.json`;
    const ghTok = env.GITHUB_TOKEN;
    if (!ghTok) {
      await heartbeat(env, 'err', 'GITHUB_TOKEN not bound');
      return { ok: false, error: 'GITHUB_TOKEN not bound' };
    }

    const repo = 'LuckDragonAsgard/asgard-workers';
    // Check if file exists for SHA (overwrite same day)
    let sha = null;
    const existRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { 'Authorization': 'Bearer ' + ghTok, 'User-Agent': 'sly-backup-cron' }
    });
    if (existRes.ok) {
      const existJ = await existRes.json();
      sha = existJ.sha;
    }

    // base64 encode JSON
    const json = JSON.stringify(dump, null, 0);
    const b64 = btoa(unescape(encodeURIComponent(json)));

    const body = { message: `sly nightly backup ${date}`, content: b64, branch: 'main' };
    if (sha) body.sha = sha;

    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + ghTok,
        'Content-Type': 'application/json',
        'User-Agent': 'sly-backup-cron'
      },
      body: JSON.stringify(body)
    });
    const putJ = await putRes.json();
    if (!putRes.ok) {
      await heartbeat(env, 'err', 'GH commit ' + putRes.status + ': ' + JSON.stringify(putJ).slice(0, 100));
      return { ok: false, error: 'GH commit failed', status: putRes.status, response: putJ };
    }

    const summary = {
      ok: true,
      date,
      path,
      commit: putJ.commit && putJ.commit.sha,
      bytes: json.length,
      tables: dump.tables ? dump.tables.length : 0,
      rows_total: dump.row_counts ? Object.values(dump.row_counts).reduce((s, n) => s + (typeof n === 'number' ? n : 0), 0) : 0
    };
    await heartbeat(env, 'ok', JSON.stringify(summary).slice(0, 200));
    return summary;
  } catch (e) {
    await heartbeat(env, 'err', String(e).slice(0, 200));
    return { ok: false, error: String(e) };
  }
}
