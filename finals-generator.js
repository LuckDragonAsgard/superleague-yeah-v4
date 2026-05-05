// Finals bracket generator — AFL Top 8 system
//
// Round mapping (SLY convention from superleagueyeah.online):
//   R21 = Qual Final  (4 matches)
//   R22 = Semi Final  (2 matches)
//   R23 = Prelim Final (2 matches)
//   R24 = Grand Final  (1 match)
//
// Bracket flow (standard AFL Top 8):
//   QF1 (1v4) → winner to PF1, loser to SF1
//   QF2 (2v3) → winner to PF2, loser to SF2
//   EF1 (5v8) → winner to SF1 (loser eliminated)
//   EF2 (6v7) → winner to SF2
//   SF1 (loser QF1 v winner EF1) → winner to PF2
//   SF2 (loser QF2 v winner EF2) → winner to PF1
//   PF1 (winner QF1 v winner SF2) → winner to GF
//   PF2 (winner QF2 v winner SF1) → winner to GF
//
// SLY labels all 4 Week-1 matches "qualifying final":
//   1st = QF1 (top-2 seed match), 2nd = QF2, 3rd = EF1 (elim), 4th = EF2 (elim)
//
// Usage: generateFinals(db, roundNumber) — idempotent, writes sly_fixtures rows.

const FINALS_ROUNDS = [21, 22, 23, 24];

async function getLadderTop8(db) {
  // Aggregate W/avg from rounds 1..20 only
  const { results } = await db.prepare(`
    SELECT c.id AS coach_id, c.name,
      SUM(CASE WHEN s.result='W' THEN 1 ELSE 0 END) AS wins,
      ROUND(AVG(s.points),2) AS avg_pts,
      SUM(s.points) AS pts_for
    FROM scores s
    JOIN coaches c ON c.id = s.coach_id
    JOIN rounds r ON r.id = s.round_id
    WHERE r.round_number BETWEEN 1 AND 20
    GROUP BY c.id, c.name
    ORDER BY wins DESC, avg_pts DESC, pts_for DESC
  `).all();
  return results.slice(0, 8); // seeds 1..8
}

async function getMatchResult(db, roundId, matchName) {
  // Returns { winner_coach_id, loser_coach_id } for a completed match by name
  const fix = await db.prepare(
    `SELECT f.home_coach_id, f.away_coach_id FROM sly_fixtures f WHERE f.round_id=? AND f.match_name=?`
  ).bind(roundId, matchName).first();
  if (!fix) return null;
  const homeScore = await db.prepare(
    `SELECT points FROM scores WHERE round_id=? AND coach_id=?`
  ).bind(roundId, fix.home_coach_id).first();
  const awayScore = await db.prepare(
    `SELECT points FROM scores WHERE round_id=? AND coach_id=?`
  ).bind(roundId, fix.away_coach_id).first();
  if (!homeScore || !awayScore || homeScore.points == null || awayScore.points == null) return null;
  if (homeScore.points >= awayScore.points) {
    return { winner: fix.home_coach_id, loser: fix.away_coach_id };
  }
  return { winner: fix.away_coach_id, loser: fix.home_coach_id };
}

async function roundIdOf(db, roundNumber) {
  const r = await db.prepare(`SELECT id FROM rounds WHERE round_number=?`).bind(roundNumber).first();
  return r ? r.id : null;
}

async function insertFixtures(db, roundId, roundNumber, fixtures) {
  // Wipe any existing finals fixtures for this round (idempotent)
  await db.prepare(`DELETE FROM sly_fixtures WHERE round_id=?`).bind(roundId).run();
  for (const f of fixtures) {
    await db.prepare(
      `INSERT INTO sly_fixtures (round_id, round_number, home_coach_id, away_coach_id, match_name) VALUES (?,?,?,?,?)`
    ).bind(roundId, roundNumber, f.home, f.away, f.name).run();
  }
}

export async function generateFinals(db, roundNumber) {
  if (!FINALS_ROUNDS.includes(roundNumber)) {
    return { ok: false, error: `R${roundNumber} is not a finals round` };
  }

  if (roundNumber === 21) {
    // Qual Final — needs ladder top 8
    const top8 = await getLadderTop8(db);
    if (top8.length < 8) return { ok: false, error: `Only ${top8.length} coaches in top 8 — R1-R20 may not be complete` };
    const [s1,s2,s3,s4,s5,s6,s7,s8] = top8;
    const fixtures = [
      { name: '1st qualifying final', home: s1.coach_id, away: s4.coach_id }, // QF1: 1v4
      { name: '2nd qualifying final', home: s2.coach_id, away: s3.coach_id }, // QF2: 2v3
      { name: '3rd qualifying final', home: s5.coach_id, away: s8.coach_id }, // EF1: 5v8
      { name: '4th qualifying final', home: s6.coach_id, away: s7.coach_id }, // EF2: 6v7
    ];
    const rid = await roundIdOf(db, 21);
    await insertFixtures(db, rid, 21, fixtures);
    return { ok: true, round: 21, fixtures, seeds: top8.map(c => c.name) };
  }

  if (roundNumber === 22) {
    // Semi Final — needs R21 results
    const rid21 = await roundIdOf(db, 21);
    const qf1 = await getMatchResult(db, rid21, '1st qualifying final');
    const qf2 = await getMatchResult(db, rid21, '2nd qualifying final');
    const ef1 = await getMatchResult(db, rid21, '3rd qualifying final');
    const ef2 = await getMatchResult(db, rid21, '4th qualifying final');
    if (!qf1 || !qf2 || !ef1 || !ef2) return { ok: false, error: 'R21 not complete or fixtures missing' };
    const fixtures = [
      { name: '1st semi final', home: qf1.loser, away: ef1.winner }, // SF1
      { name: '2nd semi final', home: qf2.loser, away: ef2.winner }, // SF2
    ];
    const rid = await roundIdOf(db, 22);
    await insertFixtures(db, rid, 22, fixtures);
    return { ok: true, round: 22, fixtures };
  }

  if (roundNumber === 23) {
    // Prelim Final — needs R21 + R22 results
    const rid21 = await roundIdOf(db, 21);
    const rid22 = await roundIdOf(db, 22);
    const qf1 = await getMatchResult(db, rid21, '1st qualifying final');
    const qf2 = await getMatchResult(db, rid21, '2nd qualifying final');
    const sf1 = await getMatchResult(db, rid22, '1st semi final');
    const sf2 = await getMatchResult(db, rid22, '2nd semi final');
    if (!qf1 || !qf2 || !sf1 || !sf2) return { ok: false, error: 'R21/R22 not complete' };
    const fixtures = [
      { name: '1st preliminary final', home: qf1.winner, away: sf2.winner }, // PF1: top seed gets reward — winner SF2 (the "harder" semi)
      { name: '2nd preliminary final', home: qf2.winner, away: sf1.winner }, // PF2
    ];
    const rid = await roundIdOf(db, 23);
    await insertFixtures(db, rid, 23, fixtures);
    return { ok: true, round: 23, fixtures };
  }

  if (roundNumber === 24) {
    // Grand Final — needs R23 results
    const rid23 = await roundIdOf(db, 23);
    const pf1 = await getMatchResult(db, rid23, '1st preliminary final');
    const pf2 = await getMatchResult(db, rid23, '2nd preliminary final');
    if (!pf1 || !pf2) return { ok: false, error: 'R23 not complete' };
    const fixtures = [
      { name: 'Grand final', home: pf1.winner, away: pf2.winner },
    ];
    const rid = await roundIdOf(db, 24);
    await insertFixtures(db, rid, 24, fixtures);
    return { ok: true, round: 24, fixtures };
  }
}
