# Superleague Yeah v4 — RESUME HERE

> Cross-account-safe entry point. If you're a fresh Claude session reading this, follow these steps.

## What this is

Paddy Gallivan's 16-coach fantasy AFL league.

- **Live URL**: https://superleague.streamlinewebapps.com
- **API**: https://sly-api.luckdragon.io
- **Source repo**: https://github.com/LuckDragonAsgard/superleague-yeah-v4

## Current state (2026-05-03)

**v4.35 LIVE** — see docs/SUPERLEAGUE-HANDOVER-v4.35.md for full architecture.

- sly-app **v5.6**: serves SPA from KV with serve-time patches. v5.6 fixed dollar-escape in replace() — Fund OUTSTANDING had JS syntax error
- sly-api at https://sly-api.luckdragon.io — custom domain live
- Fixtures tab: actual scores via correlated subquery
- Fund tab: COLLECTED / OUTSTANDING / BALANCE — 00 outstanding (0/16 paid)
- R8: GC vs GWS Q2 17:52 (39%) at session end — scoring to run after final whistle
- 175 R8 picks confirmed across 16 coaches

## Steps to resume

1. Read docs/SUPERLEAGUE-HANDOVER-v4.35.md
2. Get PIN from Mona. Secrets: curl -H "X-Pin: PIN" https://asgard-vault.pgallivan.workers.dev/secret/KEY
3. Smoke: curl -s https://superleague.streamlinewebapps.com | grep fundOutstanding

## Pending (as of 2026-05-03)

- **R8 scoring** (CRITICAL): After GC vs GWS — Admin > Auto-Sync > R8 > Sync > Recalc. Then UPDATE rounds SET is_complete=1 WHERE id=9. Affected: Dane (Ben King, Wil Powell), Age (Petracca), MDT (Ben Long, Jarrod Witts), Cram (Touk Miller, Jamarra), Joe (Matt Rowell).
- **Fund payments**: 0/16 paid, 00 outstanding. Paddy to chase.
- **Gold tier UI**: sly_gold key in D1, setGoldMember() in SPA — hold until someone pays.
