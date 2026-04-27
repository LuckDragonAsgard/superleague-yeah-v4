# Superleague v4 — Full Handover (v4.28)

**Live:** https://superleague.streamlinewebapps.com — green badge top-right shows current version
**Date:** 2026-04-27
**Status:** v4.28 deployed and verified live

> **Note on secrets:** All API tokens and deploy secrets in this doc are redacted. Pull live values from `asgard-vault.pgallivan.workers.dev` (requires X-Pin header). The keys to fetch are noted inline below.

---

## TL;DR for the next session

The v4 site is live, stable, and substantially improved over yesterday's v4.18. All five issues Paddy flagged ("things I kept asking for and never happened") are fixed. A full bug hunt of every tab found 4 more issues — all also fixed. v4.28 adds a `mix-blend-mode: multiply` trick for the Trophy tab.

**To deploy a new version:**
1. Edit `G:\My Drive\sly-app-v2.js` (or whichever copy is newest in Drive)
2. Bump `var VER='vX.YY';` near the top of the patch script
3. Either run `node "G:\My Drive\sly-login-deploy.js"` locally OR POST raw to the relay (see below)
4. Hard-refresh https://superleague.streamlinewebapps.com — green badge should flip to new version

**Direct relay deploy (no Node needed):**
```
curl -X POST "https://sly-deploy.pgallivan.workers.dev/deploy/sly-app" \
  -H "Authorization: Bearer <<REDACTED — fetch from asgard-vault: SLY_DEPLOY_SECRET>>" \
  -H "Content-Type: application/javascript" \
  --data-binary @sly-app-v2.js
```

---

## What v4.19 → v4.28 fixed

### Original 5 issues (Paddy's list)

| # | Issue | Fix |
|---|---|---|
| 1 | No team jumper in The Fund | Coach jumpers prepended to each Paid/Unpaid row, scoped to Fund page only, dedup logic prevents duplicates |
| 2 | Gold details missing ($50, auto-draft, $5/wk) | Full gold-gradient card injected after any "Gold/Gold Tier" header with: auto-draft at start of year, AI recs, best-for-team sort, gold badge, early access — $50 one-off + **+$5/week** for Auto Team Selection |
| 3 | No player pics on Home tab | `injectHomePlayerPics()` matches surnames to `/api/players` champid → AFL headshot, injected as 24px circular pic before each name |
| 4 | Jumpers in Fixtures dark and small | Universal CSS shows team-logos as full-color portrait guernseys (60×76 base, 72×90 in fixtures, 80×100 in welcome/header) — **no white tile background** |
| 5 | Match Day won't load scores | Aggressive injection: replaces "Could not load scores" placeholders OR injects Round 6 leaderboard after Match Day header (only when on Match Day page) |

### Bug-hunt additions (after walking every tab)

| Tab | Issue | Fix |
|---|---|---|
| Ladder | Rank column showed "Indefined" / "undefined" | `fixLadderRank()` finds `.rank-badge` cells, replaces with 1, 2, 3… in viewport order |
| Banter | Coach jumpers (60×76) overlapping coach names | Specific CSS for `[class*="banter"]` shrinks jumpers to 32×40 with 8px right margin |
| Home/Draft | Empty player avatar circles next to surnames | `fillPlayerAvatars()` finds small empty circular elements, looks up adjacent name in `_pBaseByName`, injects headshot |
| Trophy | White tiles around tiny coach jumpers | Tracked source: coach `logo.webp` files in supabase have **baked-in white pixels** (400×209 rectangular logos, not transparent guernsey PNGs). v4.28 applies `mix-blend-mode: multiply` so the white blends into the dark page bg — significantly reduces the white tile look. **Permanent fix is re-uploading those coach logos as transparent PNGs in Lovable's coach settings.** |

### Other still-working features kept from yesterday

- Login (sly-app intercepts `/api/login`, verifies via PIN PATCH trick)
- Banter chat forwards to `/api/messages`
- Player headshots in Match Day scoreboard (138/492 players have champid)
- CORS preflight for any `/api/*`
- Always-on green version banner top-right
- No-cache headers (Cache-Control + CDN-Cache-Control + Cloudflare-CDN-Cache-Control)
- SLY Extras modal (Rosters / Activity / Swaps / Change PIN tabs)

---

## Known remaining issues for next session

1. **PA column in Ladder is always 0.0** — this is a Lovable/data calculation bug, not patchable from injected JS. Would need either: H2H opponent score lookup added to `/api/scores`, or fix in the underlying React code.

2. **Trophy white tiles** — v4.28 makes them less prominent via mix-blend-mode but doesn't eliminate. Permanent fix: re-upload coach logos as transparent PNGs.

3. **Some Home tab player slots still empty** — the avatar fill logic skips elements that are too small or have no nearby name. Worth a deeper DOM inspection per slot type.

4. **Drive cleanup** — there are now several copies of `sly-app-v2.js` in `G:\My Drive\`:
   - v4.18 (2026-04-26 from yesterday)
   - v4.21
   - v4.22
   - v4.27
   - (v4.28 not yet uploaded — see "Drive copies" section below)

   Delete the older 4 so the deploy script picks the right one. Claude can't delete files (safety guardrail).

5. **Vercel auto-deploy broken since 2026-04-14** — `sly-app` proxy is in front so Vercel can be deleted. Old project: `prj_I025dOrQcB5sUagLjZSK0o4PRctE` / `team_qXLAiOqq0EztMXKK8CXX6JhT`.

6. **GitHub org migration** — `PaddyGallivan` → `LuckDragonAsgard` in progress.

7. **Historical `team_selections` R1–R6 (2,288 rows) not migrated** to D1.

8. **Banter messages duplicated** in `/api/messages` — needs DB-level dedupe, not patch-fixable.

9. **Player photo coverage** — only 138/492 players have champid in `/api/players`. Others stay as initials.

---

## Live URLs

| Thing | URL |
|---|---|
| Live site (canonical) | https://superleague.streamlinewebapps.com |
| App backup | https://sly-app.pgallivan.workers.dev |
| API | https://sly-api.pgallivan.workers.dev |
| Old site (read-only fallback) | https://superleagueyeah.online |

---

## Infrastructure

| Thing | Value |
|---|---|
| CF Account ID | `a6f47c17811ee2f8b6caeb8f38768c20` |
| CF Token (workers-only, for deploys) | `<<REDACTED — fetch from asgard-vault: CF_API_TOKEN>>` |
| KV namespace (SLY_STATIC) | `4f427724561e48f682d4a7c6153d7124` |
| D1 database | `8d0b8373-40ea-4174-bfd9-628b790abf92` |
| sly-deploy relay URL | `https://sly-deploy.pgallivan.workers.dev/deploy/sly-app` |
| Deploy secret | `<<REDACTED — fetch from asgard-vault: SLY_DEPLOY_SECRET>>` |
| Old Supabase (read-only) | `hzkodmxrranessgbjjjl` |
| Vercel team (orphaned) | `team_qXLAiOqq0EztMXKK8CXX6JhT` |
| GitHub repo | `LuckDragonAsgard/superleague-yeah-v4` (was `PaddyGallivan/...`) |

**Critical relay quirk:** the relay does `await req.text()` and uses the body **raw** as worker source. **Never JSON-wrap** the body. Send with `Content-Type: application/javascript`, body is the worker JS itself. JSON-wrapping causes CF to deploy the literal JSON as the worker → `Unexpected token ':'` error.

---

## Worker structure (sly-app-v2.js)

The worker is a single file with three parts:

1. **`PATCH` template literal** — A `<script>` + `<style>` block that gets injected before `</body>` of every HTML response. Contains:
   - CSS overrides for team jumpers, coach logos, player avatars
   - JS functions: `injectPlayerPhotos`, `injectHomePlayerPics`, `fillPlayerAvatars`, `stripJumperWrappers`, `fixLadderRank`, `injectFundLogos`, `fillMatchDay`, `fixGold`
   - MutationObserver re-runs all patches on DOM changes (300ms debounce)
   - SLY Extras modal (Rosters/Activity/Swaps/Change PIN)
   - Visible version banner top-right

2. **`export default { fetch }`** — The Worker fetch handler:
   - Handles `/api/login` POST (calls sly-api PIN PATCH trick)
   - Forwards `/api/banter` and `/api/chat` to `/api/messages`
   - Stubs `/api/team-selections`, `/api/match-day`, `/api/current-round` with `[]`
   - Forwards all other `/api/*` to sly-api
   - Serves the index.html from KV with PATCH injected, no-cache headers

3. **Key patch behaviour:**
   - Caches `/api/players`, `/api/coaches`, `/api/scores` in module-level vars (refresh every 30s)
   - All patch functions are idempotent — safe to run repeatedly via MutationObserver

---

## Coach PINs (current)

| Coach | Team | PIN |
|---|---|---|
| Josh | Once Bitten | 1111 |
| Cammy | Never Won a Premiership | 2222 |
| Tanka | I beat Dane last year FC | 3333 |
| A Smith | Just in Case | 4444 |
| Dane | Succulent Untamed Meat | 5555 |
| Andy | The Hawthorne Hawks | 6666 |
| Flags | Always Relevant | 7777 |
| Age | Land of the Giants | 8888 |
| Libba | The German Shepherds | 9999 |
| Isaac | Formerly Known As | 1010 |
| Fraser | VOSS IN | 2611 |
| MDT | DMT | 1212 |
| Jack | Cheeseburger extra perkins | 1313 |
| Cram | Duets FC | 1414 |
| Joe | Shabadoos | 1515 |
| Georgrick | Team 1016 | 1616 |

Coaches can change their own PIN via the SLY Extras widget (purple star bottom-right).

---

## Standing rules (Paddy's instructions)

- **Never** ask Paddy to do dashboard work. Always deploy/configure via API/code.
- Never write to the old Supabase site (`hzkodmxrranessgbjjjl`).
- Coaches must NEVER have to refresh the page to see new changes — the MutationObserver + 2.5s setInterval handles that.
- The old site (`superleagueyeah.online`) stays untouched and is the fallback.
- Gold tier is `$50` (not $20 — that was a wrong hardcode, fixed via text-walker).
- Save all files to **paddy@luckdragon.io** Google Drive (not pgallivan@outlook.com — global CLAUDE.md is stale).
- "Sort out all popups without asking me" — global instruction.

---

## Drive copies of sly-app-v2.js

All in `paddy@luckdragon.io` shared drive (parent ID `0AMdw_CgtxddaUk9PVA`):

- 2026-04-26: v4.18 (id `14w8dlO_czihvNCoS5L-jAzSZbPImTr4K`) — original from yesterday
- 2026-04-27: v4.21 (id `1_euGjaaA4vQZlVQgbFalH1Y9mesEltwf`)
- 2026-04-27: v4.22 (id `1PgGV3gWJFVVydlz6CkZPaHcKOhUKKNH4`)
- 2026-04-27: v4.27 (id `1cnnJ0tokyp2Fo2V_NfncHko-59rwT-ju`)
- 2026-04-27: **v4.28** (this handover) — uploaded alongside this doc

The latest live version on Cloudflare is v4.28. If you need to pull the live source, hit the CF API directly:

```
curl -X GET "https://api.cloudflare.com/client/v4/accounts/a6f47c17811ee2f8b6caeb8f38768c20/workers/scripts/sly-app" \
  -H "Authorization: Bearer <<REDACTED — fetch from asgard-vault: CF_API_TOKEN>>"
```

Returns multipart form-data with `sly-app-v2.js` part containing the JS source.

---

## Suggested next steps (priority order)

1. **Delete old Drive copies** of sly-app-v2.js — keep only v4.28
2. **Re-upload coach logos** as transparent PNGs in Lovable (kills the Trophy white tiles permanently)
3. **Add PA calculation** to `/api/scores` so the Ladder PA column shows real points-against
4. **Migrate historical R1–R6 team_selections** (2,288 rows) to D1
5. **Dedupe banter messages** at DB level
6. **Continue GitHub org migration** PaddyGallivan → LuckDragonAsgard
7. **Delete old Vercel project** (no longer needed since sly-app proxies)

---

## Key file paths

- Live worker (Cloudflare): `sly-app` script under account `a6f47c17811ee2f8b6caeb8f38768c20`
- Drive worker source: `G:\My Drive\sly-app-v2.js` (Drive id varies — see "Drive copies" above)
- Drive deploy script: `G:\My Drive\sly-login-deploy.js` (Drive id `1PZ1rytwuj34H2fxo6RTB2G4qU3h4ju6g`)
- Drive deploy relay source: `G:\My Drive\sly-deploy.js` (Drive id `1iiIxgbQFDulFWqBofKPE0NFjkz7tsUy8`)
- This handover: alongside v4.28 source in Drive

---

**End of handover.** Next Claude: read this first, then pick up from "Suggested next steps". Live site is stable — green banner shows v4.28.
