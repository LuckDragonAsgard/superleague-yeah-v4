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

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(syncScores(env)); },
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
  const isHighScore = (round.round_type || 'H2H') === 'HIGH_SCORE';
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
  if (allComplete && !forceRound) {
    await db.prepare('UPDATE rounds SET is_complete=1 WHERE id=?').bind(roundId).run();
    roundCompleted = true;
  }

  return {
    ok: true,
    round: roundNum,
    matched_stat_rows: stats.length,
    coaches_scored: stmts.length,
    all_games_complete: allComplete,
    incomplete_games: incompleteGames,
    round_marked_complete: roundCompleted,
    top: Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,pts])=>({id,pts})),
    ts: new Date().toISOString()
  };
}

// Approximate AFL Fantasy formula for backwards-compat audit (kicks/handballs not exposed; use disposals*2.5 as proxy)
function computeFantasyPts(s) {
  const D = s.disposals||0, M = s.marks||0, T = s.tackles||0, H = s.hitouts||0, G = s.goals||0, B = s.behinds||0;
  return Math.round(D * 2.5 + M * 3 + T * 4 + H * 1 + G * 6 + B);
}
