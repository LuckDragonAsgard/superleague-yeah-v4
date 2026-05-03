# Superleague Yeah v4 — RESUME HERE

> Cross-account-safe entry point. If you're a fresh Claude session reading this, follow these steps.

## What this is

Paddy Gallivan's 16-coach fantasy AFL league.

- **Live URL**: https://superleague.streamlinewebapps.com (Cloudflare Worker `sly-app`, serve-time patch of KV-stored SPA)
- **API**: https://sly-api.luckdragon.io (custom domain for `sly-api` CF Worker + D1)
- **Source repo**: https://github.com/LuckDragonAsgard/superleague-yeah-v4

## Current state (2026-05-03)

**v4.35 LIVE** — see `docs/SUPERLEAGUE-HANDOVER-v4.35.md` for the full picture. Key facts:

- `sly-app` v5.4: serves 383KB SPA from KV, applies serve-time `html.replace()` patches for Fund tab OUTSTANDING column, fixtures cache clear, and future patches without rewriting 383KB KV value
- `sly-api` deploys at https://sly-api.luckdragon.io — custom domain live
- Fixtures tab shows actual scores for completed rounds (correlated subquery fix in `sly-api.js`)
- Fund tab: OUTSTANDING column wired — currently $800 outstanding (0/16 paid)
- `sly_gold` config key exists in D1 `sly_config` table
- R8 in progress: GC vs GWS game still live as of 2026-05-03 ~20:00 AEST — R8 scoring to run after game finishes
- All 16 coaches have R8 picks confirmed (175 picks = 16 × ~11 slots)

## Steps to resume

1. Read `docs/SUPERLEAGUE-HANDOVER-v4.35.md` (full architecture, deploy procedure, known issues).
2. Get the current Asgard PIN from Mona out-of-band. Fetch vault secrets with: `curl -H "X-Pin: <PIN>" https://asgard-vault.pgallivan.workers.dev/secret/<KEY>`
3. Smoke check: `curl -s https://superleague.streamlinewebapps.com | grep -o 'fundOutstanding\|OUTSTANDING'` should output matches.

## Pending (as of 2026-05-03)

- **R8 scoring**: Run after GC vs GWS finishes. Admin → Auto-Sync AFL Fantasy → R8 → Sync → Recalc. Then `UPDATE rounds SET is_complete=1 WHERE id=9`.
- **Fund payments**: Chase coaches — 0/16 paid, $800 outstanding.
- **Gold tier UI**: `sly_gold` key exists in D1 but no admin UI to add coaches. `setGoldMember()` already in SPA.
