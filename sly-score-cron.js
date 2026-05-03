// sly-score-cron.js — syncs AFL Fantasy scores every minute, auto-completes round when all games finish

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

  // 1. Find live round (locked, not complete)
  const { results: rounds } = await db.prepare(
    `SELECT * FROM rounds WHERE is_complete=0 AND lock_time IS NOT NULL
     AND lock_time < datetime('now') ORDER BY round_number DESC LIMIT 1`
  ).all();
  if (!rounds.length) return { ok: true, message: 'no live round', ts: new Date().toISOString() };

  const round = rounds[0];
  const roundId = round.id;
  const roundNum = round.round_number;

  // 2. Check Squiggle — are all AFL games this round complete?
  const squiggleRes = await fetch(
    `https://api.squiggle.com.au/?q=games;year=2026;round=${roundNum}`,
    { headers: { 'User-Agent': 'SLY-LiveScore/1.0 (paddy@luckdragon.io)' } }
  );
  const squiggleData = await squiggleRes.json();
  const games = squiggleData?.games || [];
  const allComplete = games.length > 0 && games.every(g => g.complete === 100);
  const incompleteGames = games.filter(g => g.complete < 100).map(g => `${g.hteam} vs ${g.ateam} (${g.complete}%)`);

  // 3. Fetch AFL Fantasy scores (read body once as ArrayBuffer)
  const aflRes = await fetch('https://fantasy.afl.com.au/data/afl/players.json', {
    headers: { 'User-Agent': 'SLY-LiveScore/1.0 (paddy@luckdragon.io)', 'Accept-Encoding': 'identity' }
  });
  if (!aflRes.ok) return { ok: false, error: `AFL Fantasy ${aflRes.status}`, ts: new Date().toISOString() };

  const rawBytes = new Uint8Array(await aflRes.arrayBuffer());
  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(rawBytes));
  } catch {
    try {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(rawBytes); writer.close();
      let out = ''; const reader = ds.readable.getReader(); const dec = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value, { stream: true }); }
      data = JSON.parse(out);
    } catch (e) {
      return { ok: false, error: 'parse failed: ' + String(e), ts: new Date().toISOString() };
    }
  }

  // 4. Name → score map
  const scoreMap = {};
  for (const p of data) {
    const pts = p?.stats?.scores?.[String(roundNum)];
    if (pts != null) {
      const name = ((p.first_name || '') + ' ' + (p.last_name || '')).trim();
      if (name) scoreMap[name] = pts;
    }
  }

  // 5. Load players, picks, fixtures
  const [{ results: players }, { results: picks }, { results: fixtures }] = await Promise.all([
    db.prepare('SELECT id, name FROM players').all(),
    db.prepare('SELECT coach_id, player_id, slot FROM round_picks WHERE round_id=?').bind(roundId).all(),
    db.prepare('SELECT * FROM sly_fixtures WHERE round_id=?').bind(roundId).all()
  ]);

  // 6. Map player_id → pts, build stat rows
  const playerPtsMap = {};
  const statRows = [];
  for (const pl of players) {
    const pts = scoreMap[pl.name];
    if (pts != null) { playerPtsMap[pl.id] = pts; statRows.push([pl.id, pts]); }
  }
  if (!statRows.length) return { ok: false, error: 'no scores matched', ts: new Date().toISOString() };

  // 7. Upsert player_round_stats
  for (let i = 0; i < statRows.length; i += 50) {
    await db.batch(statRows.slice(i, i + 50).map(([pid, pts]) =>
      db.prepare('INSERT OR REPLACE INTO player_round_stats (player_id, round_id, fantasy_pts) VALUES (?,?,?)')
        .bind(pid, roundId, pts)
    ));
  }

  // 8. Tally coach scores
  const SCORING = new Set(['SG','G1','G2','R','M','T','D1','D2']);
  const totals = {};
  for (const pick of picks) {
    if (!SCORING.has(pick.slot)) continue;
    totals[pick.coach_id] = (totals[pick.coach_id] || 0) + (playerPtsMap[pick.player_id] || 0);
  }

  // 9. Upsert scores with W/L/D
  const fixMap = {};
  for (const f of fixtures) { fixMap[f.home_coach_id] = f; fixMap[f.away_coach_id] = f; }

  const stmts = Object.entries(totals).map(([cid, pts]) => {
    const id = Number(cid);
    const fix = fixMap[id];
    const oppId = fix ? (fix.home_coach_id === id ? fix.away_coach_id : fix.home_coach_id) : null;
    const oppPts = oppId ? (totals[oppId] || 0) : 0;
    const result = allComplete && oppId ? (pts > oppPts ? 'W' : pts < oppPts ? 'L' : 'D') : null;
    return db.prepare(
      `INSERT OR REPLACE INTO scores (coach_id,round_id,points,result,opponent_id,points_against,max_score) VALUES (?,?,?,?,?,?,0)`
    ).bind(id, roundId, pts, result, oppId, oppPts);
  });
  if (stmts.length) await db.batch(stmts);

  // 10. Auto-complete round if all AFL games done
  let roundCompleted = false;
  if (allComplete) {
    await db.prepare('UPDATE rounds SET is_complete=1 WHERE id=?').bind(roundId).run();
    roundCompleted = true;
  }

  return {
    ok: true,
    round: roundNum,
    matched: statRows.length,
    coaches: stmts.length,
    all_games_complete: allComplete,
    incomplete_games: incompleteGames,
    round_marked_complete: roundCompleted,
    top: Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,pts])=>({id,pts})),
    ts: new Date().toISOString()
  };
}
