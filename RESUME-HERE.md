# Superleague Yeah v4 — RESUME HERE

> Cross-account-safe entry point. If you're a fresh Claude session reading this, follow these steps.

## What this is

Paddy Gallivan's 16-coach fantasy AFL league.

- **Live URL**: https://superleague.streamlinewebapps.com (Cloudflare Worker `sly-app`, true reverse proxy of mate's site)
- **Mate's underlying site**: https://superleagueyeah.online (Lovable + Supabase)
- **v4 backend**: https://sly-api.pgallivan.workers.dev (Cloudflare Worker + D1)
- **Source repo**: https://github.com/LuckDragonAsgard/superleague-yeah-v4

## Current state (2026-04-29)

**v4.34 LIVE** — see `docs/SUPERLEAGUE-HANDOVER-v4.34.md` for the full picture. In one paragraph: `sly-app` was rewritten this session as a true reverse proxy of `superleagueyeah.online`, so mate's full Lovable build (with his Supabase auth, his latest features) renders at the streamlinewebapps URL with our patch script (`PATCH` const inside `sly-app-v2.js`) injected into every HTML response. Round 7 scores were computed from 461 player stat rows pulled from mate's Supabase and POSTed to v4's `sly-api`. Coach PINs (1111-9999, listed in vault `SUPERLEAGUE_V4_STATE_2026_04_25`) are for the v4 backend only — production auth is mate's Supabase email/password.

## Steps to resume

1. Read `docs/SUPERLEAGUE-HANDOVER-v4.34.md` (full architecture, deploy procedure, known issues).
2. Pull current `sly-app-v2.js` from the repo root.
3. PIN for vault is `2967`. Get any other secret with `curl -H "X-Pin: 2967" https://asgard-vault.pgallivan.workers.dev/secret/<KEY>`.
4. Smoke check: `curl -s https://superleague.streamlinewebapps.com | grep -oE "VER='v4\.[0-9]+"` should return current version.
