# SLY Fantasy AFL — RESUME HERE

**Last updated:** 2026-05-04  
**App version:** sly-app v5.23  
**Status:** ✅ Production — all 15 tabs verified clean, R8 final, R9 open. Rules tab + every-player tracker live.

---

## App URLs & Access

| Thing | Value |
|---|---|
| App | https://superleague.streamlinewebapps.com |
| API | https://sly-api.luckdragon.io |
| Admin PIN | 535554 |
| D1 database ID | `8d0b8373-40ea-4174-bfd9-628b790abf92` |
| KV namespace ID | `4f427724561e48f682d4a7c6153d7124` (key: `standalone-index.html`) |
| CF Account | `a6f47c17811ee2f8b6caeb8f38768c20` (Luck Dragon Main) |
| CF API token | `curl -s -H "X-Pin: 535554" https://asgard-vault.luckdragon.io/secret/CF_API_TOKEN` |
| GitHub PAT | `curl -s -H "X-Pin: 535554" https://asgard-vault.luckdragon.io/secret/GITHUB_TOKEN` |
| GitHub org | LuckDragonAsgard / superleague-yeah-v4 |

---

## Architecture

```
Browser → superleague.streamlinewebapps.com
             ↓
         sly-app (CF Worker)
           - Proxies /api/* to sly-api.luckdragon.io
           - Fetches standalone-index.html from KV (SLY_STATIC binding)
           - Applies 9 serve-time patches before serving HTML
             ↓
         sly-api (CF Worker + D1 binding: DB)
           - All REST endpoints
             ↓
         D1 SQLite (sly — 8d0b8373)
```

**Cron workers:**
- `sly-score-cron` — every 1 min, syncs AFL Fantasy stats, auto-marks round complete
- `sly-autopick-cron` — every 15 min, auto-picks for opted-in + paid coaches near lockout
- `sly-notify-cron` — reminder notifications

**Deploy version bump:** Every sly-app deploy must update the version constant in 3 places — the `// sly-app v5.X` comment, `/_version` route literal, and Patch 15 `var V=` literal — so auto-refresh fires.

**⚠️ CRITICAL deploy rule:** CF Workers API PUT replaces ALL non-secret bindings with whatever you send. Omit a binding → it silently disappears. Always include:
- `sly-app`: KV `SLY_STATIC` namespace_id `4f427724561e48f682d4a7c6153d7124`
- `sly-api`: D1 `DB` id `8d0b8373-40ea-4174-bfd9-628b790abf92`

Verify after every deploy: `GET /client/v4/accounts/{id}/workers/scripts/{name}/bindings`

---

## SPA Patches (serve-time, in sly-app-v2.js)

| # | What |
|---|---|
| 1 | Fund: OUTSTANDING column (COLLECTED / OUTSTANDING / BALANCE) |
| 2 | Fund: OUTSTANDING computed dynamically from payments |
| 3 | Clears fixtures cache after admin score recalc |
| 4 | Home: round selection fix (`upcoming` → `open`) |
| 5 | Home: status label fix for open rounds |
| 6 | Banter: chat text visible in light mode (`body.light-mode #pageChat .chat-msg-text`) |
| 7 | Autopick toggle: $5 warning modal + updated description |
| 8 | Fund: AUTOPICK TAB section (public opted-in list) |
| 9 | Draft: board explanation blurb + friendlier private chat UX |
| 10 | Rules: nav button → pageRules |
| 11 | Rules page: rules content + usage compliance leaderboard |
| 12 | Pick: every-player widget above slots |
| 13 | JS: loadRulesTab + loadPickUsageWidget + switchPage hook |
| 14 | Kill `mix-blend-mode:multiply` on team logos — was making dark logos invisible on dark cards everywhere |
| 15 | Auto-refresh: poll `/_version` every 90s, reload page when version changes |
| 16 | Add `crossorigin="anonymous"` to coach-logo-img so SLY-FIX v6 canvas-strip works (was failing silently due to tainted canvas) |
| 17 | Raise SLY-FIX v6 white-guard threshold from 0.45 → 0.985 |

**Single source-of-truth for version:** top of sly-app-v2.js has `const VERSION = 'v5.X'`. Bump that on every deploy and the comment, /_version route, and Patch 15 all pick it up automatically.

**Round types (synced from old site):**
| Rounds | Type | Result rule |
|---|---|---|
| R0–R11, R17–R20 | H2H | Each coach vs fixture opponent — pts > oppPts → W |
| R12–R16 | HIGH_SCORE | Rank all 16 by points; top 8 → W, bottom 8 → L (no fixtures) |

`rounds.round_type` column added; `/api/rounds` returns it. Cron auto-handles both. R12-R16 will render with empty fixtures until Paddy designs the HIGH_SCORE display.

**Scoring (verified against superleagueyeah.online):**
| Slot | Formula |
|---|---|
| SG | 10×goals + behinds |
| G1, G2 | 6×goals + behinds |
| R | 0.5×hitouts + 0.5×disposals + marks |
| M | 4×marks |
| T | 4×tackles |
| D1, D2 | disposals |

Stats source: `match_player_stats` table on the old site's Supabase (publicly readable, anon key in cron). R1-R8 were backfilled from old-site totals (D1 picks were stale — rolled-over migration values, not actual lockout-time picks). Cron now refuses to overwrite `is_complete=1` rounds without `?allow_overwrite_complete=1`. R9+ scoring uses the new app's pick data, which is correct.

**Auth (v5.23):** Per-coach mutations require `X-Coach-Id` + `X-Coach-Pin` headers. SPA injects them from sessionStorage after login. Admin endpoints require coach.id===1 OR `Authorization: Bearer ${MIGRATION_TOKEN}` (used by sly-autopick-cron). 6 previously open holes now gated. See `sly-checks.py`.

---

## Verified Working (as at 2026-05-04)

| Tab | Status | Notes |
|---|---|---|
| Home | ✅ | R9 open, countdown, "who hasn't submitted" card, stat ticker |
| Ladder | ✅ | Josh #1 (28pts, avg 232.1), all 16 coaches |
| Fixtures | ✅ | R8 scores shown, /api/sly-fixtures with correlated subquery |
| Teams | ✅ | Player photos rendering, no white rectangles, team jerseys correct |
| Pick | ✅ | Team selection, lock countdown banner, activity feed names correct |
| Fund | ✅ | OUTSTANDING column, red unpaid highlights, AUTOPICK TAB |
| Trades | ✅ | Loads correctly |
| Banter | ✅ | Chat visible in both light/dark mode, DMs working |
| Stats | ✅ | Season stats load |
| H2H | ✅ | Head-to-head comparison loads |
| Draft | ✅ | Board explanation blurb added, "🔒 Private message" (not "encrypted — not for you") |
| Admin | ✅ | Score recalc, R0 = Opening Round (correct) |
| Injuries | ✅ | 39 entries |
| Trophy | ✅ | Cabinet names visible in light + dark mode |
| Match Day | ✅ | /api/squiggle proxy, live game data |
| Rules | ✅ | League rules + every-player compliance leaderboard (sortable, click to expand) |

**Live stat updates:** Ticker bar scrolls season stats (high/low scores, averages, ladder). During live rounds, `sly-score-cron` updates scores every 1 min — coaches see latest on refresh.

**Encrypted chats:** Optional feature when creating a new group DM. Checkbox now labelled "🔒 Make this chat private". If a coach gets a message from a private chat they're not in, they see "🔒 Private message" (was "encrypted — not for you").

---

## Outstanding (Paddy's jobs)

| What | How |
|---|---|
| Chase $50 league payments | Fund tab → tap coach card (admin) |
| Autopick $5 payments | Fund tab → AUTOPICK TAB section → tap card |
| Gold tier admin UI | Build when first person pays (setGoldMember() in SPA) |

---

## How to Deploy

### Worker (Python)
```python
import requests, json

TOKEN = "$(curl -s -H 'X-Pin: 535554' https://asgard-vault.luckdragon.io/secret/CF_API_TOKEN)"
ACCOUNT = "a6f47c17811ee2f8b6caeb8f38768c20"

# sly-app
with open('sly-app-v2.js','rb') as f: code = f.read()
requests.put(
    f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/workers/scripts/sly-app",
    headers={"Authorization": f"Bearer {TOKEN}"},
    files=[
        ("metadata",(None,json.dumps({"main_module":"sly-app-v2.js","bindings":[{"type":"kv_namespace","name":"SLY_STATIC","namespace_id":"4f427724561e48f682d4a7c6153d7124"}]}),"application/json")),
        ("sly-app-v2.js",("sly-app-v2.js",code,"application/javascript+module"))
    ]
)

# sly-api — same but binding is D1:
# {"type":"d1","name":"DB","id":"8d0b8373-40ea-4174-bfd9-628b790abf92"}
```

### GitHub
```bash
PAT=$(curl -s -H "X-Pin: 535554" https://asgard-vault.luckdragon.io/secret/GITHUB_TOKEN)
cd /tmp/sly-repo && git fetch origin && git reset --hard origin/main
# copy changed files, then:
git add . && git commit -m "your message" && git push
```

---

## D1 Key Tables

| Table | Purpose |
|---|---|
| coaches | 16 coaches, PINs, auto_pick_enabled |
| rounds | R0–R10, lock_time, is_complete, status |
| round_picks | 11-player selections per coach per round |
| scores | Points + W/L per coach per round |
| sly_fixtures | H2H matchups per round |
| payments | paid (league $50), autopick_paid ($5), gold_balance |
| player_round_stats | AFL Fantasy scores per player per round |
| messages | Banter chat |
| injury_list | Current injuries |
| sly_config | App config keys |

**New endpoint:** `GET /api/usage-tracker[?coach_id=X]` — per-coach squad/used/unused/compliance_pct, sorted desc by compliance.

---

## Next Actions

1. **Chase coaches for $50** — mark via Fund tab
2. **R9 lockout** — coaches submit picks; autopick fires for paid opt-ins
3. **R9 scoring** — fully automatic via sly-score-cron
4. **Gold UI** — when first person pays
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        