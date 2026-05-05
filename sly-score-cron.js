// sly-score-cron.js v2 — position-specialist scoring from Supabase match_player_stats
// Formula (per slot):
//   SG: 10*goals + behinds          (super-goalkicker)
//   G1, G2: 6*goals + behinds        (goalkickers)
//   R: 0.5*hitouts + 0.5*disposals + marks   (ruck)
//   M: 4*marks                       (marker)
//   T: 4*tackles                     (tackler)
//   D1, D2: disposals                (defenders)
// Verified against old site (superleagueyeah.online) for R1-R8 — exact match.
// Documented: https://github.com/PaddyGallivan/asgard-source/blob/main/docs/ENGINEERING-RULES.md

const SB = 'https://hzkodmxrranessgbjjjl.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6a29kbXhycmFuZXNzZ2JqampsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjE5ODYsImV4cCI6MjA4Njc5Nzk4Nn0.7Tiy5bLjN-9Iy1D-Ihb_TPrPNQZWhrzWHjMDy6rgUNI';

const SLOT_FORMULA = {
  SG: s => 10 * (s.goals||0) + (s.behinds||0),
  G1: s => 6 * (s.goals||0) + (s.behinds||0),
  G2: s => 6 * (s.goals||0) + (s.behinds||0),
  R:  s => 0.5 * (s.hitouts||0) + 0.5 * (s.disposals||0) + (s.marks||0),
  M:  s => 4 * (s.marks||0),
  T:  s => 4 * (s.tackles||0),
  D1: s => (s.disposals||0),
  D2: s => (s.disposals||0),
};
const STARTERS = new Set(Object.keys(SLOT_FORMULA));

// Heartbeat helper — POST /api/cron/heartbeat with admin token
async function heartbeat(env, status, message) {
  try {
    const tok = env.MIGRATION_TOKEN || 'SLY_MIGRATION_2026_04_25';
    await fetch('https://sly-api.luckdragon.io/api/cron/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ cron_name: 'sly-score-cron', status, message })
    });
  } catch (e) {}
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try { const r = await syncScores(env); await heartbeat(env, 'ok', JSON.stringify(r).slice(0, 200)); }
      catch (e) { await heartbeat(env, 'err', String(e).slice(0, 200)); throw e; }
    })());
  },
  async fetch(req, env) {
    const u = new URL(req.url);
    const force = +u.searchParams.get('force_round') || null;
    const allowOverwrite = u.searchParams.get('allow_overwrite_complete') === '1';
    return new Response(JSON.stringify(await syncScores(env, force, allowOverwrite), null, 2),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
};

async function fetchSupabaseStats(roundNumber) {
  // Paginate match_player_stats for the given round_number
  const all = [];
  let offset = 0;
  while (true) {
    const r = await fetch(`${SB}/rest/v1/match_player_stats?round_number=eq.${roundNumber}&limit=1000&offset=${offset}`,
      { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    const page = await r.json();
    if (!page.length) break;
    all.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function syncScores(env, forceRound, allowOverwriteComplete) {
  const db = env.DB;

  let round;
  if (forceRound) {
    round = await db.prepare('SELECT * FROM rounds WHERE round_number=?').bind(forceRound).first();
    if (!round) return { ok: false, error: `round ${forceRound} not found` };
  } else {
    const { results } = await db.prepare(
      `SELECT * FROM rounds WHERE is_complete=0 AND lock_time IS NOT NULL
       AND lock_time < datetime('now') ORDER BY round_number DESC LIMIT 1`).all();
    if (!results.length) return { ok: true, message: 'no live round', ts: new Date().toISOString() };
    round = results[0];
  }
  const roundId = round.id;
  const roundNum = round.round_number;

  // Squiggle — only for auto-complete check
  let allComplete = false; let incompleteGames = [];
  try {
    const sq = await fetch(`https://api.squiggle.com.au/?q=games;year=2026;round=${roundNum}`,
      { headers: { 'User-Agent': 'SLY-LiveScore/1.0 (paddy@luckdragon.io)' } });
    const games = (await sq.json())?.games || [];
    allComplete = games.length > 0 && games.every(g => g.complete === 100);
    incompleteGames = games.filter(g => g.complete < 100).map(g => `${g.hteam} vs ${g.ateam} (${g.complete}%)`);
  } catch (e) { /* squiggle optional */ }

  // Pull match stats from Supabase (publicly readable)
  let stats;
  try { stats = await fetchSupabaseStats(roundNum); }
  catch (e) { return { ok: false, error: 'supabase fetch failed: ' + e.message, ts: new Date().toISOString() }; }
  const statsByPid = {};
  for (const s of stats) statsByPid[s.player_id] = s;

  // Load picks + fixtures for this round
  const [{ results: picks }, { results: fixtures }] = await Promise.all([
    db.prepare('SELECT coach_id, slot, player_id FROM round_picks WHERE round_id=?').bind(roundId).all(),
    db.prepare('SELECT * FROM sly_fixtures WHERE round_id=?').bind(roundId).all(),
  ]);

  // Tally coach scores via slot formula
  const totals = {};
  for (const pick of picks) {
    if (!STARTERS.has(pick.slot)) continue;  // skip emergencies
    const s = statsByPid[pick.player_id];
    const pts = s ? SLOT_FORMULA[pick.slot](s) : 0;
    totals[pick.coach_id] = (totals[pick.coach_id] || 0) + pts;
  }

  // Build score rows (preserve W/L/D from fixture matchup)
  const fixMap = {};
  for (const f of fixtures) { fixMap[f.home_coach_id] = f; fixMap[f.away_coach_id] = f; }

  // Safety: refuse to overwrite completed rounds unless explicitly allowed.
  // R1-R8 were backfilled from old site (superleagueyeah.online) because D1 picks
  // are stale (rolled-over from migration, not actual lockout-time picks).
  // Cron must NEVER touch them by default.
  if (round.is_complete && !allowOverwriteComplete) {
    return {
      ok: true, dry_run: true,
      reason: 'Round is_complete=1, refusing to write. Pass &allow_overwrite_complete=1 to override.',
      round: roundNum, computed_totals: totals,
      ts: new Date().toISOString()
    };
  }
  // Determine results based on round_type:
  //   H2H: each coach vs their fixture opponent — pts > oppPts -> W
  //   HIGH_SCORE: rank all 16 by points; top 8 -> W, bottom 8 -> L (no opponent)
  const isHighScore = (round.round_type || 'H2H') === 'HS';
  let highScoreRanked = null;
  if (isHighScore && allComplete) {
    highScoreRanked = Object.entries(totals)
      .sort((a,b) => b[1] - a[1])
      .map(([cid, pts], idx) => ({ cid: Number(cid), pts, rank: idx + 1, result: idx < 8 ? 'W' : 'L' }));
  }
  const stmts = Object.entries(totals).map(([cid, pts]) => {
    const id = Number(cid);
    let oppId = null, oppPts = 0, result = null;
    if (isHighScore) {
      if (highScoreRanked) {
        const me = highScoreRanked.find(x => x.cid === id);
        result = me ? me.result : null;
      }
    } else {
      const fix = fixMap[id];
      oppId = fix ? (fix.home_coach_id === id ? fix.away_coach_id : fix.home_coach_id) : null;
      oppPts = oppId ? (totals[oppId] || 0) : 0;
      result = allComplete && oppId ? (pts > oppPts ? 'W' : pts < oppPts ? 'L' : 'D') : null;
    }
    return db.prepare(
      `INSERT OR REPLACE INTO scores (coach_id,round_id,points,result,opponent_id,points_against,max_score) VALUES (?,?,?,?,?,?,0)`
    ).bind(id, roundId, pts, result, oppId, oppPts);
  });
  if (stmts.length) await db.batch(stmts);

  // Persist player_round_stats too (audit trail; recompute-able)
  if (stats.length) {
    const statBatches = [];
    for (let i = 0; i < stats.length; i += 50) {
      statBatches.push(db.batch(stats.slice(i, i + 50).map(s =>
        db.prepare('INSERT OR REPLACE INTO player_round_stats (player_id, round_id, fantasy_pts, goals, behinds, disposals, marks, tackles, hitouts) VALUES (?,?,?,?,?,?,?,?,?)')
          .bind(s.player_id, roundId,
                computeFantasyPts(s),
                s.goals||0, s.behinds||0, s.disposals||0, s.marks||0, s.tackles||0, s.hitouts||0)
      )));
    }
    await Promise.all(statBatches);
  }

  let roundCompleted = false;
  let finalsAutoGenerated = null;
  if (allComplete && !forceRound) {
    await db.prepare('UPDATE rounds SET is_complete=1 WHERE id=?').bind(roundId).run();
    roundCompleted = true;
    // Auto-trigger finals bracket generation when feeder round completes
    // R20 → R21 (Qual), R21 → R22 (Semi), R22 → R23 (Prelim), R23 → R24 (Grand)
    const nextFinalsRound = { 20: 21, 21: 22, 22: 23, 23: 24 }[roundNum];
    if (nextFinalsRound) {
      try {
        finalsAutoGenerated = await generateFinalsForRound(db, nextFinalsRound);
      } catch (e) {
        finalsAutoGenerated = { ok: false, error: String(e).slice(0, 200) };
      }
    }
  }

  return {
    ok: true,
    round: roundNum,
    matched_stat_rows: stats.length,
    coaches_scored: stmts.length,
    all_games_complete: allComplete,
    incomplete_games: incompleteGames,
    round_marked_complete: roundCompleted,
    finals_auto_generated: finalsAutoGenerated,
    top: Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,pts])=>({id,pts})),
    ts: new Date().toISOString()
  };
}

// Approximate AFL Fantasy formula for backwards-compat audit (kicks/handballs not exposed; use disposals*2.5 as proxy)
function computeFantasyPts(s) {
  const D = s.disposals||0, M = s.marks||0, T = s.tackles||0, H = s.hitouts||0, G = s.goals||0, B = s.behinds||0;
  return Math.round(D * 2.5 + M * 3 + T * 4 + H * 1 + G * 6 + B);
}


// Finals bracket generator — AFL Top 8 (auto-fired when feeder round completes)
async function generateFinalsForRound(db, rn) {
  const ridOf = async (n) => { const r = await db.prepare("SELECT id FROM rounds WHERE round_number=?").bind(n).first(); return r ? r.id : null; };
  const ladderTop8 = async () => { const { results } = await db.prepare("SELECT c.id AS coach_id,c.name,SUM(CASE WHEN s.result='W' THEN 1 ELSE 0 END) AS wins,ROUND(AVG(s.points),2) AS avg_pts,SUM(s.points) AS pts_for FROM scores s JOIN coaches c ON c.id=s.coach_id JOIN rounds r ON r.id=s.round_id WHERE r.round_number BETWEEN 1 AND 20 GROUP BY c.id,c.name ORDER BY wins DESC,avg_pts DESC,pts_for DESC").all(); return results.slice(0, 8); };
  const matchResult = async (rid, name) => { const f = await db.prepare("SELECT home_coach_id,away_coach_id FROM sly_fixtures WHERE round_id=? AND match_name=?").bind(rid, name).first(); if (!f) return null; const h = await db.prepare("SELECT points FROM scores WHERE round_id=? AND coach_id=?").bind(rid, f.home_coach_id).first(); const a = await db.prepare("SELECT points FROM scores WHERE round_id=? AND coach_id=?").bind(rid, f.away_coach_id).first(); if (!h || !a || h.points == null || a.points == null) return null; return h.points >= a.points ? { winner: f.home_coach_id, loser: f.away_coach_id } : { winner: f.away_coach_id, loser: f.home_coach_id }; };
  const writeFixtures = async (rid, n, fix) => { await db.prepare("DELETE FROM sly_fixtures WHERE round_id=?").bind(rid).run(); for (const f of fix) await db.prepare("INSERT INTO sly_fixtures (round_id,round_number,home_coach_id,away_coach_id,match_name) VALUES (?,?,?,?,?)").bind(rid, n, f.home, f.away, f.name).run(); };
  if (rn === 21) {
    const t = await ladderTop8(); if (t.length < 8) return { ok: false, error: 'top 8 incomplete' };
    const [s1, s2, s3, s4, s5, s6, s7, s8] = t;
    const fix = [{ name: '1st qualifying final', home: s1.coach_id, away: s4.coach_id }, { name: '2nd qualifying final', home: s2.coach_id, away: s3.coach_id }, { name: '3rd qualifying final', home: s5.coach_id, away: s8.coach_id }, { name: '4th qualifying final', home: s6.coach_id, away: s7.coach_id }];
    const rid = await ridOf(21); await writeFixtures(rid, 21, fix); return { ok: true, round: 21, seeds: t.map(c => c.name), fixtures: fix };
  }
  if (rn === 22) {
    const r21 = await ridOf(21); const qf1 = await matchResult(r21, '1st qualifying final'); const qf2 = await matchResult(r21, '2nd qualifying final'); const ef1 = await matchResult(r21, '3rd qualifying final'); const ef2 = await matchResult(r21, '4th qualifying final');
    if (!qf1 || !qf2 || !ef1 || !ef2) return { ok: false, error: 'R21 incomplete' };
    const fix = [{ name: '1st semi final', home: qf1.loser, away: ef1.winner }, { name: '2nd semi final', home: qf2.loser, away: ef2.winner }];
    const rid = await ridOf(22); await writeFixtures(rid, 22, fix); return { ok: true, round: 22, fixtures: fix };
  }
  if (rn === 23) {
    const r21 = await ridOf(21); const r22 = await ridOf(22); const qf1 = await matchResult(r21, '1st qualifying final'); const qf2 = await matchResult(r21, '2nd qualifying final'); const sf1 = await matchResult(r22, '1st semi final'); const sf2 = await matchResult(r22, '2nd semi final');
    if (!qf1 || !qf2 || !sf1 || !sf2) return { ok: false, error: 'R21/R22 incomplete' };
    const fix = [{ name: '1st preliminary final', home: qf1.winner, away: sf2.winner }, { name: '2nd preliminary final', home: qf2.winner, away: sf1.winner }];
    const rid = await ridOf(23); await writeFixtures(rid, 23, fix); return { ok: true, round: 23, fixtures: fix };
  }
  if (rn === 24) {
    const r23 = await ridOf(23); const pf1 = await matchResult(r23, '1st preliminary final'); const pf2 = await matchResult(r23, '2nd preliminary final');
    if (!pf1 || !pf2) return { ok: false, error: 'R23 incomplete' };
    const fix = [{ name: 'Grand final', home: pf1.winner, away: pf2.winner }];
    const rid = await ridOf(24); await writeFixtures(rid, 24, fix); return { ok: true, round: 24, fixtures: fix };
  }
  return { ok: false, error: 'not a finals round' };
}
