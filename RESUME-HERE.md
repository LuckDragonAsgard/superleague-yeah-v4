# SLY Fantasy AFL — RESUME HERE

**Last updated:** 2026-05-04  
**App version:** sly-app v5.12  
**Status:** ✅ Production — all tabs verified clean, R8 final, R9 open

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
| GitHub org | LuckDragonAsgard |
| Repo | superleague-yeah-v4 |

---

## Architecture

```
Browser → superleague.streamlinewebapps.com
             ↓
         sly-app (CF Worker)
           - Proxies /api/* to sly-api.luckdragon.io
           - Fetches standalone-index.html from KV (SLY_STATIC binding)
           - Applies serve-time JS/HTML patches (Patches 1–8) before serving
             ↓
         sly-api (CF Worker, D1 binding: DB → sly D1)
           - All REST endpoints (/api/coaches, /api/scores, /api/payments, etc.)
             ↓
         D1 SQLite database (sly)
```

**Cron workers:**
- `sly-score-cron` — runs every 1 min, syncs AFL Fantasy stats, auto-marks round complete when all AFL matches done
- `sly-autopick-cron` — runs every 15 min, auto-picks for opted-in + paid coaches within 30h of lockout
- `sly-notify-cron` — reminder notifications

**CRITICAL deploy rule:** When deploying any CF Worker via API PUT, you MUST include all non-secret bindings in metadata or they are silently wiped. Secrets (secret_text) are preserved automatically.
- `sly-app` needs: `{"type":"kv_namespace","name":"SLY_STATIC","namespace_id":"4f427724561e48f682d4a7c6153d7124"}`
- `sly-api` needs: `{"type":"d1","name":"DB","id":"8d0b8373-40ea-4174-bfd9-628b790abf92"}`

---

## Current State

### League
- **16 coaches**, R1–R8 complete, R9 open (next round to lock)
- **Ladder leader:** Josh (28 pts, avg 232.1)
- **R8 result:** All 16 coaches scored, GC beat GWS 83–63 (auto-synced by score-cron)
- **Fund:** $800 outstanding — 0/16 coaches have paid the $50 league fee yet

### SPA Patches (serve-time, applied in sly-app-v2.js)
All patches target `standalone-index.html` stored in KV:

| # | What it does |
|---|---|
| 1 | Fund tab: adds OUTSTANDING column (COLLECTED / OUTSTANDING / BALANCE) |
| 2 | Fund tab: computes OUTSTANDING dynamically from payments |
| 3 | Clears fixtures cache after admin score recalc |
| 4 | Home page: fixes round selection (`upcoming` → `open`) |
| 5 | Home page: fixes status label for open rounds |
| 6 | Banter: fixes chat text invisible in light mode (specificity: `body.light-mode #pageChat .chat-msg-text`) |
| 7 | Autopick toggle: updated description + `$5 owe SLY` confirmation modal |
| 8 | Fund tab: AUTOPICK TAB section (public, shows opted-in coaches + paid status) |

---

## Everything Completed (verified live)

### Infrastructure
- ✅ sly-api D1 binding restored after Falkor migration
- ✅ PADDY_PIN env binding restored to asgard-vault
- ✅ `sly-api.luckdragon.io` custom domain added
- ✅ Service worker unregister snippet — eliminates hard refresh requirement
- ✅ All pgallivan.workers.dev references removed from app + worker
- ✅ mix-blend-mode:multiply on Supabase coach images (fixes white rectangles)

### Scoring & Data
- ✅ R1–R7 historical team selections migrated to D1
- ✅ R7 marked complete, scores finalised
- ✅ R8 AFL Fantasy stats synced (387 players matched)
- ✅ All 16 coaches have R8 final scores + W/L results
- ✅ R8 round marked `is_complete=1` (auto via sly-score-cron)
- ✅ `sly-score-cron` built and deployed — runs every 1 min, fully automatic going forward
- ✅ POST /api/scores accepts array (batch recalc from Admin tab works)
- ✅ /api/scores SQL bug fixed (was mixing rounds in result calculation)
- ✅ Tanka's incomplete R8 picks overridden with R7 team

### UI / Tab audit — all tabs verified clean
- ✅ **Home** — correct round shown, live/open status label, "who hasn't submitted" card
- ✅ **Ladder** — all 16 coaches, correct points/avg
- ✅ **Fixtures** — scores shown (not "vs"), R8 all 8 results correct
- ✅ **Teams** — coach rosters load correctly, VOSS IN logo fixed
- ✅ **Pick** — team selection works, lock countdown banner (< 3h warning), blank player name in activity feed fixed
- ✅ **Fund** — COLLECTED / OUTSTANDING / BALANCE columns, unpaid coaches highlighted red, AUTOPICK TAB section
- ✅ **Trades** — loads correctly
- ✅ **Banter** — chat text visible in light mode (dark navy, not white-on-white)
- ✅ **Stats** — loads correctly
- ✅ **H2H** — loads correctly
- ✅ **Draft** — DRAFT_PICKS functional (360 rows in D1)
- ✅ **Admin** — score recalc works, round 0 = Opening Round (correct, not a bug)
- ✅ **Injuries** — 39 entries load correctly
- ✅ **Trophy** — cabinet names visible (Josh, Cammy, Isaac, Flags, Age), light mode fixed
- ✅ **Match Day** — /api/squiggle proxy working, live game data loads

### Navigation
- ✅ Nav: scrollable overflow-x, active pill highlight, scrollIntoView, login logo gradient

### Autopick $5 Feature (new — 2026-05-04)
- ✅ `payments.autopick_paid` column added to D1
- ✅ `/api/autopick-status` endpoint — public, returns opted-in coaches + payment status
- ✅ Autopick toggle (Profile): updated description, confirmation modal ("You'll owe SLY $5")
- ✅ Autopick cron: gated on `auto_pick_enabled=1` AND `autopick_paid=1`
- ✅ Fund tab: AUTOPICK TAB section visible to all — shows who's opted in, who's paid

---

## Outstanding (Paddy's jobs, not bugs)

### Fund payments
- 0/16 coaches have paid the $50 league fee
- Mark payments via Fund tab → tap coach card (admin only) → PATCH /api/payments/:id

### Autopick payments
- Nobody has opted in yet — Autopick Tab shows "No coaches have enabled autopick yet"
- When a coach opts in via Profile toggle → they appear on Autopick Tab as "Owes $5"
- Mark paid via Autopick Tab → tap coach card (admin only)

### Gold tier UI
- `sly_gold` config key exists in D1, `setGoldMember()` exists in SPA
- No admin UI to assign gold members yet — not needed until someone pays
- Gold members get ⭐ badge across the app

---

## How to Deploy

### Worker code change
```python
import requests, json

ACCOUNT_ID = "a6f47c17811ee2f8b6caeb8f38768c20"
TOKEN = "<from vault: curl -s -H 'X-Pin: 535554' https://asgard-vault.luckdragon.io/secret/CF_API_TOKEN>"

with open('sly-app-v2.js', 'rb') as f:
    code = f.read()

metadata = {
    "main_module": "sly-app-v2.js",
    "bindings": [{"type": "kv_namespace", "name": "SLY_STATIC", "namespace_id": "4f427724561e48f682d4a7c6153d7124"}]
}

requests.put(
    f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/sly-app",
    headers={"Authorization": f"Bearer {TOKEN}"},
    files=[("metadata", (None, json.dumps(metadata), "application/json")),
           ("sly-app-v2.js", ("sly-app-v2.js", code, "application/javascript+module"))]
)
```

For `sly-api`, replace `sly-app-v2.js` and use binding:
```json
{"type": "d1", "name": "DB", "id": "8d0b8373-40ea-4174-bfd9-628b790abf92"}
```

Always verify bindings after deploy:
```
GET https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/{WORKER}/bindings
```

### Updating the SPA HTML (standalone-index.html in KV)
Use the asgard-tools admin endpoint or write directly to KV namespace `4f427724561e48f682d4a7c6153d7124` with key `standalone-index.html`.

### GitHub
```bash
PAT=$(curl -s -H "X-Pin: 535554" https://asgard-vault.luckdragon.io/secret/GITHUB_TOKEN)
git remote set-url origin "https://LuckDragonAsgard:${PAT}@github.com/LuckDragonAsgard/superleague-yeah-v4.git"
git push
```

---

## Key D1 Tables

| Table | Purpose |
|---|---|
| `coaches` | 16 coaches, PINs, auto_pick_enabled |
| `rounds` | R0–R10, lock_time, is_complete, status |
| `round_picks` | Each coach's 11-player selection per round |
| `scores` | Points + W/L result per coach per round |
| `sly_fixtures` | H2H matchups per round |
| `payments` | League fee (paid/$50) + autopick_paid + gold_balance |
| `player_round_stats` | AFL Fantasy scores per player per round |
| `messages` | Banter chat |
| `injury_list` | Current injuries (synced externally) |
| `sly_config` | App config keys (sly_gold etc.) |

---

## Next Actions When You Return

1. **Chase coaches for $50 payment** — mark via Fund tab
2. **R9 lockout** — coaches need to submit picks; autopick fires automatically for paid opt-ins
3. **R9 scoring** — sly-score-cron handles automatically after AFL matches complete
4. **Gold tier** — build admin UI toggle when first person pays (setGoldMember() already in SPA)
