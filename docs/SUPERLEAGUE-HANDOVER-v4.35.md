# Superleague Yeah v4 — Handover (v4.35, 2026-05-01)

> **START HERE** for next session. Source: `LuckDragonAsgard/superleague-yeah-v4`.
> Live at `https://superleague.streamlinewebapps.com` and `https://superleagueyeah.online`.

## What changed v4.34 → v4.35

### Logo rendering (KV patch, live now)
- **Removed `mix-blend-mode: multiply`** from all coach logo images. Multiply blends white→dark on a dark background, making white jerseys invisible. Now `normal` blend mode.
- **Added `drop-shadow(0 1px 4px rgba(0,0,0,0.55))`** to all logo images (`logo.webp`, `team-logos`, Supabase URLs). Helps any logo — especially VOSS IN's white jersey — pop on the dark `rgb(22,26,29)` background.
- **White-jersey guard in canvas strip (SLY-FIX v6 patched)**: Added pixel-ratio check before the white-stripping pass. If >45% of an image's pixels are white, the strip is skipped entirely — the image renders at full quality. Prevents white jersey logos being stripped to near-nothing.
- **Broken AFL player headshot graceful hide**: Added `color: transparent` to `img[src*="ChampIDImages"]`. Hides the alt-text/broken-icon on missing AFL player photos; `bg-muted` class provides fallback colour circle.

### Architecture (unchanged from v4.34)
- `sly-app-v2.js` serves `standalone-index.html` from KV namespace `4f427724561e48f682d4a7c6153d7124`
- All patches live in KV HTML, not in the GitHub repo `index.html` (that's the LessonLab landing page)
- To deploy: write patched HTML to KV via CF API (see v4.34 handover for command)

## Full-tab bug sweep (2026-05-01)

| Tab | Status | Notes |
|---|---|---|
| Home | ✅ Clean | Activity feed live, countdown working, 0 broken images |
| Lists | ✅ Clean | Player stats rendering, Squads/Browse tabs working |
| Fixture | ✅ Clean | R8 live, teams shown with picks, "✓ Team in" badges |
| Team | ✅ Clean | Slot picking UI works, Load last team button present |
| Ladder | ✅ Clean | All 16 coaches ranked, logos all loaded with shadow |
| Injuries | ⚠️ Minor | ~52 broken AFL headshots (AFL CDN missing photos). Now hidden gracefully with `color:transparent`. Not our bug. |

## Round 8 status (as of 2026-05-01)

- All 16 coaches have R8 picks in D1
- Lockout: Fri 1 May 7:30 PM AEST
- Scores not yet computed (games in progress this weekend)
- R8 scoring: same process as R7 — pull stats from Supabase `match_player_stats`, compute, POST to `sly-api/api/scores`

## Still pending (Paddy)

1. **The Fund** — 0/16 paid. Use `PATCH /api/payments/:id` with `{paid:1}` per coach
2. **VOSS IN / Fraser logo** — white jersey now renders fine with our shadow fix. Fraser can re-upload with transparent background for even cleaner look, but not urgent
3. **R8 scoring** — after this weekend's games

## Known issues (carried from v4.34)

- `rollover` endpoint duplicated 3× in `sly-api.js` source (first instance handles it, benign)
- R7 scoring formula approximate (see v4.34 for formula)
- Supabase `team_selections` / `sly_rounds` tables RLS-protected for anon

## Deploy procedure

```bash
# Patch KV HTML
CFT=$(curl -s -H "X-Pin: <PIN>" https://asgard-vault.pgallivan.workers.dev/secret/CF_API_TOKEN)
ACCOUNT="a6f47c17811ee2f8b6caeb8f38768c20"
KV_NS="4f427724561e48f682d4a7c6153d7124"
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/storage/kv/namespaces/$KV_NS/values/standalone-index.html" \
  -H "Authorization: Bearer $CFT" \
  -H "Content-Type: text/html; charset=utf-8" \
  --data-binary @index-patched.html
```
