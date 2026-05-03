// sly-score-cron.js — syncs AFL Fantasy scores to D1 every minute during live rounds

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncScores(env));
  },
  async fetch(req, env) {
    const result = await syncScores(env);
    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};

async function syncScores(env) {
  const db = env.DB;

  // 1. Find live round
  const { results: rounds } = await db.prepare(
    `SELECT * FROM rounds WHERE is_complete=0 AND lock_time IS NOT NULL
     AND lock_time < datetime('now') ORDER BY round_number DESC LIMIT 1`
  ).all();
  if (!rounds.length) return { ok: true, message: 'no live round', ts: new Date().toISOString() };

  const round = rounds[0];
  const roundId = round.id;
  const roundNum = round.round_number;

  // 2. Fetch AFL Fantasy — read body once as ArrayBuffer, try parse both ways
  const aflRes = await fetch('https://fantasy.afl.com.au/data/afl/players.json', {
    headers: { 'User-Agent': 'SLY-LiveScore/1.0 (paddy@luckdragon.io)', 'Accept-Encoding': 'identity' }
  });
  if (!aflRes.ok) return { ok: false, error: `AFL Fantasy ${aflRes.status}`, ts: new Date().toISOString() };

  const buf = await aflRes.arrayBuffer();
  const rawBytes = new Uint8Array(buf);

  let data;
  // Try plain JSON first (most likely with Accept-Encoding: identity)
  try {
    data = JSON.parse(new TextDecoder().decode(rawBytes));
  } catch {
    // Fall back to gzip
    try {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(rawBytes); writer.close();
      let out = '';
      const reader = ds.readable.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        out += dec.decode(value, { stream: true });
      }
      data = JSON.parse(out);
    } catch (e) {
      return { ok: false, error: 'parse failed: ' + String(e), ts: new Date().toISOString() };
    }
  }

  // 3. Name → score map for this round
  const scoreMap = {};
  for (const p of data) {
    const pts = p?.stats?.scores?.[String(roundNum)];
    if (pts != null) {
      const name = ((p.first_name || '') + ' ' + (p.last_name || '')).trim();
      if (name) scoreMap[name] = pts;
    }
  }

  // 4. Load players, picks, fixtures in parallel
  const [{ results: players }, { results: picks }, { results: fixtures }] = await Promise.all([
    db.prepare('SELECT id, name FROM players').all(),
    db.prepare('SELECT coach_id, player_id, slot FROM round_picks WHERE round_id=?').bind(roundId).all(),
    db.prepare('SELECT * FROM sly_fixtures WHERE round_id=?').bind(roundId).all()
  ]);

  // 5. Map player_id → pts
  const playerPtsMap = {};
  const statRows = [];
  for (const pl of players) {
    const pts = scoreMap[pl.name];
    if (pts != null) {
      playerPtsMap[pl.id] = pts;
      statRows.push([pl.id, pts]);
    }
  }
  if (!statRows.length) return { ok: false, error: 'no scores matched', ts: new Date().toISOString() };

  // 6. Upsert player_round_stats
  for (let i = 0; i < statRows.length; i += 50) {
    await db.batch(statRows.slice(i, i + 50).map(([pid, pts]) =>
      db.prepare('INSERT OR REPLACE INTO player_round_stats (player_id, round_id, fantasy_pts) VALUES (?,?,?)')
        .bind(pid, roundId, pts)
    ));
  }

  // 7. Tally coach scores (scoring slots only)
  const SCORING = new Set(['SG','G1','G2','R','M','T','D1','D2']);
  const totals = {};
  for (const pick of picks) {
    if (!SCORING.has(pick.slot)) continue;
    totals[pick.coach_id] = (totals[pick.coach_id] || 0) + (playerPtsMap[pick.player_id] || 0);
  }

  // 8. Resolve fixtures
  const fixMap = {};
  for (const f of fixtures) {
    fixMap[f.home_coach_id] = f;
    fixMap[f.away_coach_id] = f;
  }

  // 9. Upsert scores
  const stmts = Object.entries(totals).map(([cid, pts]) => {
    const id = Number(cid);
    const fix = fixMap[id];
    const oppId = fix ? (fix.home_coach_id === id ? fix.away_coach_id : fix.home_coach_id) : null;
    const oppPts = oppId ? (totals[oppId] || 0) : 0;
    const result = oppId ? (pts > oppPts ? 'W' : pts < oppPts ? 'L' : 'D') : null;
    return db.prepare(
      `INSERT OR REPLACE INTO scores (coach_id,round_id,points,result,opponent_id,points_against,max_score) VALUES (?,?,?,?,?,?,0)`
    ).bind(id, roundId, pts, result, oppId, oppPts);
  });
  if (stmts.length) await db.batch(stmts);

  return {
    ok: true, round: roundNum,
    matched: statRows.length,
    coaches: stmts.length,
    top: Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,pts])=>({id,pts})),
    ts: new Date().toISOString()
  };
}
