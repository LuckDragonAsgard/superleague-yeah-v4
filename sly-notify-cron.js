// sly-notify-cron — Thursday AFL pick reminders + auto-rollover
// Crons: 06:30 UTC (teams drop), 08:00 UTC (30min warning), 09:00 UTC (post-lock rollover)
// Uses D1 directly to avoid CF worker-to-worker loopback (1042 error)

const SITE = 'https://superleague.streamlinewebapps.com';
const MIGRATION_TOKEN = 'SLY_MIGRATION_2026_04_25';

async function discord(webhookUrl, embeds) {
  return fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds })
  });
}

async function getNextRound(db) {
  const now = new Date();
  const twoHrsAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const row = await db.prepare(
    "SELECT id,name,round_number,lock_time FROM rounds WHERE lock_time > ? ORDER BY lock_time ASC LIMIT 1"
  ).bind(twoHrsAgo).first();
  return row;
}

async function getRecentlyLockedRound(db) {
  const now = new Date();
  const ninetyMinsAgo = new Date(now - 90 * 60 * 1000).toISOString();
  const row = await db.prepare(
    "SELECT id,name,round_number,lock_time FROM rounds WHERE lock_time <= ? AND lock_time > ? ORDER BY lock_time DESC LIMIT 1"
  ).bind(now.toISOString(), ninetyMinsAgo).first();
  return row;
}

async function getMissingCoaches(db, roundNumber) {
  const { results } = await db.prepare(`
    SELECT c.name FROM coaches c
    WHERE c.id NOT IN (
      SELECT DISTINCT rp.coach_id FROM round_picks rp
      JOIN rounds r ON r.id = rp.round_id
      WHERE r.round_number = ?
    ) ORDER BY c.name
  `).bind(roundNumber).all();
  return results.map(r => r.name);
}

async function doRollover(db, roundNumber) {
  const round = await db.prepare('SELECT id FROM rounds WHERE round_number=?').bind(roundNumber).first();
  if (!round) return { ok: false, error: 'round not found' };
  const prevRound = await db.prepare('SELECT id FROM rounds WHERE round_number=?').bind(roundNumber - 1).first();
  if (!prevRound) return { ok: false, error: 'prev round not found' };

  const { results: coaches } = await db.prepare('SELECT id,name FROM coaches').all();
  const { results: existing } = await db.prepare('SELECT DISTINCT coach_id FROM round_picks WHERE round_id=?').bind(round.id).all();
  const hasPicksSet = new Set(existing.map(p => p.coach_id));
  const missing = coaches.filter(c => !hasPicksSet.has(c.id));
  if (!missing.length) return { ok: true, rolled: [], noPrev: [] };

  const rolled = [], noPrev = [], stmts = [];
  for (const coach of missing) {
    const { results: prevPicks } = await db.prepare('SELECT player_id,slot FROM round_picks WHERE round_id=? AND coach_id=?').bind(prevRound.id, coach.id).all();
    if (!prevPicks.length) { noPrev.push(coach.name); continue; }
    for (const pk of prevPicks) {
      stmts.push(db.prepare('INSERT OR IGNORE INTO round_picks (coach_id,round_id,player_id,slot,banter) VALUES (?,?,?,?,?)').bind(coach.id, round.id, pk.player_id, pk.slot, 'auto-rollover'));
    }
    rolled.push(coach.name);
  }
  if (stmts.length) await db.batch(stmts);
  return { ok: true, rolled, noPrev };
}

async function runTeamsDrop(db, webhookUrl) {
  const round = await getNextRound(db);
  if (!round) return { ok: false, reason: 'no upcoming round' };
  const lockAEST = new Date(round.lock_time).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: true });
  await discord(webhookUrl, [{
    title: `🏉 AFL teams just dropped — ${round.name} picks are open!`,
    description: `Check injuries and who's in/out, then lock in your team.\n\n⏰ **Picks lock at ${lockAEST} AEST** (~2 hours from now)\n\n👉 [Set your picks now](${SITE})`,
    color: 0x00d4ff,
    footer: { text: 'Superleague Yeah v4' }
  }]);
  return { ok: true, action: 'teams_drop', round: round.name };
}

async function runLockWarning(db, webhookUrl) {
  const round = await getNextRound(db);
  if (!round) return { ok: false, reason: 'no upcoming round' };
  const missing = await getMissingCoaches(db, round.round_number);
  const missingText = missing.length
    ? `\n\n📋 **Still to pick:** ${missing.join(', ')}`
    : '\n\n✅ Everyone\'s already in!';
  await discord(webhookUrl, [{
    title: `⏰ 30 minutes until ${round.name} picks lock!`,
    description: `Get your team in now or you'll **roll over with last week's squad.**${missingText}\n\n👉 [Pick now](${SITE})`,
    color: 0xff9900,
    footer: { text: 'Superleague Yeah v4' }
  }]);
  return { ok: true, action: 'lock_warning', round: round.name, missing };
}

async function runPostLockRollover(db, webhookUrl) {
  const round = await getRecentlyLockedRound(db);
  if (!round) return { ok: false, reason: 'no recently locked round' };

  const result = await doRollover(db, round.round_number);
  if (!result.ok) {
    await discord(webhookUrl, [{ title: `⚠️ Rollover failed for ${round.name}`, description: result.error, color: 0xff0000 }]);
    return result;
  }

  if (result.rolled.length === 0 && result.noPrev.length === 0) {
    await discord(webhookUrl, [{
      title: `🔒 ${round.name} locked — all coaches submitted!`,
      description: `Everyone got their picks in this week. Good luck! 🏆\n\n👉 [View the round](${SITE})`,
      color: 0x00cc44,
      footer: { text: 'Superleague Yeah v4' }
    }]);
  } else {
    const desc = result.rolled.length
      ? `🔄 **Auto-rolled (last week's team):** ${result.rolled.join(', ')}`
      : '';
    const noPicksDesc = result.noPrev.length
      ? `\n⚠️ **No picks at all (no prev round either):** ${result.noPrev.join(', ')}`
      : '';
    await discord(webhookUrl, [{
      title: `🔒 ${round.name} locked`,
      description: `${desc}${noPicksDesc}\n\n👉 [View picks](${SITE})`,
      color: 0xffcc00,
      footer: { text: 'Superleague Yeah v4 · Auto-rollover' }
    }]);
  }
  return { ok: true, action: 'post_lock_rollover', round: round.name, rolled: result.rolled.length };
}

export default {
  async scheduled(event, env, ctx) {
    const db = env.DB;
    const webhookUrl = env.DISCORD_WEBHOOK;
    if (!db || !webhookUrl) return;
    const now = new Date();
    const h = now.getUTCHours(), min = now.getUTCMinutes();
    if (h === 6 && min < 45)       ctx.waitUntil(runTeamsDrop(db, webhookUrl));
    else if (h === 8 && min < 15)  ctx.waitUntil(runLockWarning(db, webhookUrl));
    else if (h === 9 && min < 15)  ctx.waitUntil(runPostLockRollover(db, webhookUrl));
  },

  async fetch(req, env) {
    const u = new URL(req.url);
    const action = u.searchParams.get('action') || 'lock_warning';
    const db = env.DB;
    const webhookUrl = env.DISCORD_WEBHOOK;
    if (!db) return new Response(JSON.stringify({ error: 'DB not bound' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    if (!webhookUrl) return new Response(JSON.stringify({ error: 'DISCORD_WEBHOOK not set' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    let result;
    if (action === 'teams_drop')         result = await runTeamsDrop(db, webhookUrl);
    else if (action === 'lock_warning')  result = await runLockWarning(db, webhookUrl);
    else if (action === 'post_lock_rollover') result = await runPostLockRollover(db, webhookUrl);
    else result = { error: 'unknown action — use teams_drop, lock_warning, or post_lock_rollover' };
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  }
};
