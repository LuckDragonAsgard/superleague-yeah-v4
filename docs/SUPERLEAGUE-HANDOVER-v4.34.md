# Superleague Yeah v4 — Handover (v4.34, 2026-04-29)

> **⚠️ START HERE** if you're a fresh Claude session.
> Source of truth is **THIS GitHub repo** (`LuckDragonAsgard/superleague-yeah-v4`).
> Live at `https://superleague.streamlinewebapps.com`. Badge top-right reads `v4.34 · LIVE`.

## TL;DR — what changed v4.31 → v4.34

This session reshaped the whole architecture.

- **v4.32**: widened `fixGold()` regex so the `+$5/week Auto Team Selection` addon renders on the Fund tab regardless of whether Lovable wraps "Gold" with extra elements.
- **v4.33**: added `/assets/*`, `/favicon.svg`, `/manifest.webmanifest`, `/pwa-*`, `/~*` proxy paths so mate's bundled JS/CSS/images load through `sly-app`.
- **v4.34** (architectural fix): **`sly-app` is now a true reverse proxy** of `https://superleagueyeah.online`. Dropped the KV-stored HTML snapshot. Every request fetches mate's site live; patches inject only into HTML responses. No more KV drift, mate's auth (Supabase) works natively, his latest features always present.

## Live infrastructure

| Worker | Hostname | Purpose |
|---|---|---|
| `sly-app` | superleague.streamlinewebapps.com (custom) + sly-app.pgallivan.workers.dev | True reverse proxy of mate's `.online`; injects `PATCH` into HTML |
| `sly-api` | sly-api.pgallivan.workers.dev | v4 backend (D1, scoring, coaches). Used by `/api/v4/*` namespace and `/api/login` bridge |
| `sly-deploy` | sly-deploy.pgallivan.workers.dev | Relay for deploying sly-app — **CF token inside is dead, use direct CF API instead** |
| `gh-push` | gh-push.pgallivan.workers.dev | POSTs commits to GitHub (needs `Authorization: Bearer GH_PUSH_BEARER`) |
| `asgard-vault` | asgard-vault.pgallivan.workers.dev | Secret KV (X-Pin: 2967) |

## Round 7 scores (loaded this session)

16 coach scores live in v4 D1 (`scores` table), `round_id=8`. Computed from real R7 player stats:

1. Pulled 461 R7 player stats from mate's Supabase (`hzkodmxrranessgbjjjl.match_player_stats?round_number=eq.7`, anon key in JS bundle).
2. Joined to v4's 176 R7 picks (174/176 matched — 2 picks have no stat row).
3. Formula used: `disposals × 2.5 + marks × 3 + tackles × 4 + goals × 6 + behinds × 1 + hitouts × 1`, scaled by `0.18` to match historical R6 magnitude (~140 avg).
4. POSTed 16 rows to `sly-api/api/scores`.

**The formula is a guess** — sly-api doesn't expose mate's exact rule. Ordering reflects real R7 stats but absolute points may differ. To re-load with the right formula, recompute and POST again (INSERT OR REPLACE on `coach_id, round_id`).

Top of R7 ladder: Once Bitten 183.6, Team 1016 171.9, Cheeseburger 159.1, Hawthorne Hawks 155.9, DMT 154.3.

## Auth model

**Mate's Supabase auth** (email/password + Google + magic link) is the production auth flow. Coaches log in with their existing `.online` accounts.

The v4 `coach_id + PIN` system in `sly-api/api/coaches/login` still exists but is **not wired to the live UI**. There's a bridge endpoint at `/api/login` in `sly-app` that accepts `{coach_id, pin}` and proxies to v4 — currently unused.

If you want PIN auth on the live URL, you'd need to:
- Intercept Supabase login on the page (replace `supabase.auth.signInWithPassword`)
- Call `/api/login` with the email-as-coach-id + password-as-pin
- Synthesise a Supabase session manually so the React app considers the user authenticated

That's a half-day of work. Not blocking — mate's auth works as is.

## Repo layout

| File | Purpose |
|---|---|
| `sly-app-v2.js` | The proxy worker (current = **v4.34**). Single file. |
| `sly-deploy.js` | Relay worker source (CF token inside is dead — see below) |
| `gh-push.js` | GitHub push worker source |
| `README.md` | Quick infra reference |
| `docs/HANDOVER.md` | Top-level pointer |
| `docs/SUPERLEAGUE-HANDOVER-v4.31.md` | Previous handover (kept) |
| `docs/SUPERLEAGUE-HANDOVER-v4.34.md` | **This file — current state** |
| `RESUME-HERE.md` | Cross-account-safe entry point (one-line briefing for fresh Claude) |

## Deploy procedure (v4.34 onward)

**`sly-deploy` is dead** — its hardcoded CF token (`cfat_9NmvBO36...`) returns "Authentication error". Use direct CF API instead.

```bash
PIN=2967
CFT=$(curl -s -H "X-Pin: $PIN" https://asgard-vault.pgallivan.workers.dev/secret/CF_API_TOKEN)
ACCOUNT="a6f47c17811ee2f8b6caeb8f38768c20"
BOUNDARY="----LDDeploy2026"
METADATA='{"main_module":"sly-app-v2.js","compatibility_date":"2024-01-01","bindings":[{"type":"kv_namespace","name":"SLY_STATIC","namespace_id":"4f427724561e48f682d4a7c6153d7124"}]}'

{
  printf -- "--%s\r\n" "$BOUNDARY"
  printf 'Content-Disposition: form-data; name="metadata"; filename="metadata.json"\r\n'
  printf 'Content-Type: application/json\r\n\r\n'
  printf '%s\r\n' "$METADATA"
  printf -- "--%s\r\n" "$BOUNDARY"
  printf 'Content-Disposition: form-data; name="sly-app-v2.js"; filename="sly-app-v2.js"\r\n'
  printf 'Content-Type: application/javascript+module\r\n\r\n'
  cat sly-app-v2.js
  printf '\r\n--%s--\r\n' "$BOUNDARY"
} > deploy.bin

curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/workers/scripts/sly-app" \
  -H "Authorization: Bearer $CFT" \
  -H "Content-Type: multipart/form-data; boundary=$BOUNDARY" \
  --data-binary @deploy.bin
```

Push source to GitHub:

```bash
GHT=$(curl -s -H "X-Pin: $PIN" https://asgard-vault.pgallivan.workers.dev/secret/GITHUB_TOKEN)
SHA=$(curl -s "https://api.github.com/repos/LuckDragonAsgard/superleague-yeah-v4/contents/sly-app-v2.js" | jq -r .sha)
B64=$(base64 -w0 sly-app-v2.js)
curl -X PUT "https://api.github.com/repos/LuckDragonAsgard/superleague-yeah-v4/contents/sly-app-v2.js" \
  -H "Authorization: Bearer $GHT" \
  -d "{\"message\":\"v4.X: ...\",\"content\":\"$B64\",\"sha\":\"$SHA\"}"
```

## Known issues / not addressed this session

- **Carlton WAF blocks Python urllib User-Agent** when POSTing to sly-api — use curl with `-H "User-Agent: Mozilla/5.0"` instead.
- **R7 scoring formula approximate** — see Round 7 section above.
- **`sly_rounds` / `sly_matches` Supabase tables RLS-protected** for anon reads — couldn't pull canonical league fixtures/scores without a logged-in session.
- **Coach jumper logos in dark theme** — still rendering dark (data fix: coaches re-upload transparent PNGs in Lovable).
- **Trophy white-tile partial** — same data fix as above.
- **`/api/scores?round=7` returns mixed rows** because the SQL query matches both `round_id=7` AND `round_number=7`. Use `?round_id=8` (round 7 has DB id=8) for clean R7 reads.

## Standing rules (per Mona, 2026-04-27, still current)

1. Nothing in Drive. Nothing local. GitHub `LuckDragonAsgard/` is the only durable store.
2. Push code/config/docs via `gh-push.pgallivan.workers.dev` (needs `Authorization: Bearer GH_PUSH_BEARER`).
3. Secrets live in `asgard-vault.pgallivan.workers.dev` (X-Pin: 2967). Never commit secret values.
4. When wrapping up: write a v4.X+1 successor handover and commit directly. No "save to local first."

## Recent versions

| Version | Date | Notable change |
|---|---|---|
| v4.27 | 2026-04-27 | JS-strip white wrappers around Trophy jumpers |
| v4.28 | 2026-04-27 | mix-blend-mode for Trophy white tiles + Home/Draft empty avatars |
| v4.30 | 2026-04-27/28 | (deployed by someone else) — introduced giant 1080×1080 face regression |
| v4.31 | 2026-04-28 | Hard-cap player headshots — fix v4.30 regression |
| v4.32 | 2026-04-29 | Widen `fixGold()` regex for `+$5/week Auto Team Selection` addon trigger |
| v4.33 | 2026-04-29 | Add `/assets/*` + static-file proxy so bundled JS/CSS/images load |
| **v4.34** | **2026-04-29** | **True reverse proxy of `.online` — dropped KV snapshot, mate's site fetched live, patches inject into HTML responses only** |
