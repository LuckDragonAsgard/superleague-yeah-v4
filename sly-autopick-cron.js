// sly-autopick-cron — runs every 15 min, finds rounds locking soon, auto-picks for opted-in coaches
export default {
  async scheduled(event, env, ctx) {
    return await runAutoPicks();
  },
  async fetch(req) {
    return new Response(JSON.stringify(await runAutoPicks()), { headers: { 'Content-Type': 'application/json' } });
  }
};

async function runAutoPicks() {
  const API = 'https://sly-api.luckdragon.io';
  // Find next round whose lock_time is within the next 30 hours and not yet locked
  const rounds = await (await fetch(API + '/api/rounds')).json();
  const now = Date.now();
  const targets = rounds.filter(r => r.lock_time && new Date(r.lock_time).getTime() > now && new Date(r.lock_time).getTime() < now + 30*60*60*1000 && !r.is_complete);
  if (!targets.length) return { ok: true, message: 'no rounds locking within 30h', targets: 0 };

  // Get all coaches with auto_pick_enabled=1 AND autopick_paid=1
  const autopickStatus = await (await fetch(API + '/api/autopick-status')).json();
  const optedIn = (Array.isArray(autopickStatus) ? autopickStatus : []).filter(c => c.auto_pick_enabled && c.autopick_paid);
  if (!optedIn.length) return { ok: true, message: 'no coaches opted in + paid', targets: targets.length, opted_in: 0 };

  const results = [];
  for (const round of targets) {
    for (const coach of optedIn) {
      try {
        const r = await fetch(API + '/api/auto_pick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coach_id: coach.id, round_id: round.id })
        });
        const j = await r.json();
        results.push({ coach_id: coach.id, round_id: round.id, ok: j.ok, projected_total: j.projected_total });
      } catch (e) {
        results.push({ coach_id: coach.id, round_id: round.id, ok: false, error: String(e) });
      }
    }
  }
  return { ok: true, ran_at: new Date().toISOString(), targets: targets.length, opted_in: optedIn.length, results };
}
