# Superleague v4 — Full Handover (v4.28)

**Live:** https://superleague.streamlinewebapps.com — green badge top-right shows current version
**Date:** 2026-04-27 (SECOND handoff between Claude accounts today, both due to usage limits)
**Status:** v4.28 deployed and verified live, GitHub source-of-truth populated and verified

---

## START HERE — context for the new Claude account

You are at least the 3rd Claude on this project today. Sequence so far:

1. **Claude #1 (Opus 4.7, prior account)** — shipped v4.19 -> v4.28, full bug-hunt, moved source-of-truth from Drive to GitHub repo `LuckDragonAsgard/superleague-yeah-v4`, set up `gh-push.pgallivan.workers.dev` relay, set up `asgard-vault.pgallivan.workers.dev` for secrets. Hit usage limit.
2. **Claude #2 (different account)** — verified everything was working: confirmed live site on v4.28 (HTML response 384KB, banner shows v4.28), confirmed all GitHub files present at correct sizes (sly-app-v2.js 32,452B, sly-deploy.js 3,547B, gh-push.js 3,018B, README.md 1,688B, this doc 11,463B). Could not delete old Drive copies — Claude is hard-blocked from destructive Drive actions even with permission. Hit usage limit before pushing this handover update.
3. **Claude #3 (you, fresh account)** — picking up here. Live site is stable on v4.28, no urgent fires. GitHub repo is the source of truth.

**First thing to do when you resume:**

1. Read this whole doc.
2. Hit https://superleague.streamlinewebapps.com — confirm green banner top-right shows v4.28 (or whatever's current).
3. Ask Paddy what he wants to work on. Don't pre-emptively fix things.

**Important behaviour rules:**

- Save NEW code/config to GitHub via `gh-push.pgallivan.workers.dev` (POST `{owner, repo, path, content, message}` JSON, include a Mozilla User-Agent or CF blocks). NOT to Drive.
- Drive is only for live-edit Office files now (.docx, .xlsx, .pptx) plus Paddy's local Drive copy of sly-app-v2.js for hand-editing.
- Secrets live in `asgard-vault.pgallivan.workers.dev` (X-Pin auth required). Never commit secret values to GitHub — secret scanning will reject the push.
- Paddy doesn't want to do dashboard work. Always deploy/configure via API/code.
- Coaches must NEVER need a hard refresh — the patch's MutationObserver + 2.5s setInterval handles re-renders.
- Sort out popups without asking.
- Claude cannot delete files on Paddy's Drive — destructive actions are guardrailed even with permission. Surface one-click Drive links instead.

---

## Last verified state (2026-04-27, by Claude #2)

| Check | Result |
|---|---|
| https://superleague.streamlinewebapps.com loads | OK — HTTP 200, 384KB HTML response |
| Green version banner shows v4.28 | OK |
| GitHub `sly-app-v2.js` present | OK — 32,452 bytes |
| GitHub `sly-deploy.js` present | OK — 3,547 bytes (secrets redacted) |
| GitHub `gh-push.js` present | OK — 3,018 bytes |
| GitHub `README.md` present | OK — 1,688 bytes |
| GitHub `docs/SUPERLEAGUE-HANDOVER-v4.28.md` present | OK — 11,463 bytes (this doc, pre-update) |
| Drive copies deleted | PENDING — see "Outstanding manual tasks" |
| Coach logo white tiles permanent fix | RESOLVED — v4.28 mix-blend-mode is the final solution; Lovable is being deprecated, no re-upload happening |

---

## Outstanding manual tasks (only Paddy can do)

### 1. Delete old Drive copies

Open https://drive.google.com/drive/folders/0AMdw_CgtxddaUk9PVA, sort by Name, multi-select all `sly-*.js` files, hit Delete. Specifically these are obsolete:

- `sly-app-v2.js` v4.18 (yesterday's copy)
- `sly-app-v2.js` v4.21
- `sly-app-v2.js` v4.22
- `sly-app-v2.js` v4.27
- `sly-deploy.js` (now in GitHub)
- `sly-login-deploy.js` (obsolete — use direct curl deploy)
- `sly-app-worker-v2.js` (orphan in outputs folder)
- Optionally `SUPERLEAGUE-HANDOVER-v4.28.md` Drive backup (now in GitHub)

### 2. ~~Re-upload coach logos as transparent PNGs in Lovable~~ — DROPPED

Paddy is migrating Superleague off Lovable to a new platform (2026-04-27). v4.28's `mix-blend-mode: multiply` trick is now the *final* solution for the Trophy white tiles, not a temporary papering-over. Don't propose Lovable-side fixes (coach logo re-upload, PA-column React fix, etc.) — they're abandonware.

---

## Deploy commands

**Direct relay deploy (no Node needed):**

```
curl -X POST "https://sly-deploy.pgallivan.workers.dev/deploy/sly-app" \
  -H "Authorization: Bearer <<REDACTED — fetch from asgard-vault: SLY_DEPLOY_SECRET>>" \
  -H "Content-Type: application/javascript" \
  --data-binary @sly-app-v2.js
```

**Push to GitHub via gh-push:**

```
curl -X POST "https://gh-push.pgallivan.workers.dev/" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0" \
  -d "$(jq -n --rawfile c sly-app-v2.js '{owner:"LuckDragonAsgard",repo:"superleague-yeah-v4",path:"sly-app-v2.js",content:$c,message:"vX.YY"}')"
```

(`gh-push` reads `GITHUB_TOKEN` from its own worker env — don't put it in the body.)

**Critical relay quirks:**
- `sly-deploy` does `await req.text()` and uses the body raw. NEVER JSON-wrap. Send `Content-Type: application/javascript`.
- `gh-push` requires a User-Agent header; CF default UA is sometimes blocked, use Mozilla.
- `gh-push` `content` field takes **raw UTF-8 text**, not base64 — the relay base64-encodes internally before forwarding to GitHub's Contents API. Pre-encoding causes double-encoding. (Older notes saying `<base64>` are wrong; verified 2026-04-27.)

---

## Known remaining issues

> **Lovable is being deprecated.** Items below tagged "(Lovable)" are upstream bugs in the platform Paddy is leaving — note them, don't fix them.

1. **PA column in Ladder is always 0.0** — (Lovable) data calculation bug. Don't fix.
2. **Trophy white tiles** — RESOLVED via v4.28 `mix-blend-mode: multiply`. Final solution.
3. **Some Home tab player slots still empty** — avatar fill logic skips elements that are too small or have no nearby name. Worth a deeper DOM inspection if Paddy asks.
4. **Drive cleanup** — see Outstanding manual tasks.
5. **Vercel auto-deploy broken since 2026-04-14** — sly-app proxy is in front so Vercel can be deleted. Old project: `prj_I025dOrQcB5sUagLjZSK0o4PRctE` / `team_qXLAiOqq0EztMXKK8CXX6JhT`.
6. **GitHub org migration** — `PaddyGallivan` -> `LuckDragonAsgard` in progress.
7. **Historical `team_selections` R1–R6 (2,288 rows) not migrated to D1.**
8. **Banter messages duplicated** in `/api/messages` — (Lovable) needs DB-level dedupe. Don't fix.
9. **Player photo coverage** — only 138/492 players have champid in `/api/players`.

---

## Live URLs

| Thing | URL |
|---|---|
| Live site (canonical) | https://superleague.streamlinewebapps.com |
| App backup | https://sly-app.pgallivan.workers.dev |
| API | https://sly-api.pgallivan.workers.dev |
| Old site (read-only fallback) | https://superleagueyeah.online |
| Deploy relay | https://sly-deploy.pgallivan.workers.dev/deploy/sly-app |
| GitHub push relay | https://gh-push.pgallivan.workers.dev/ |
| Secrets vault | https://asgard-vault.pgallivan.workers.dev (X-Pin auth) |
| GitHub repo | https://github.com/LuckDragonAsgard/superleague-yeah-v4 |

---

## Infrastructure

| Thing | Value |
|---|---|
| CF Account ID | `a6f47c17811ee2f8b6caeb8f38768c20` |
| KV namespace (SLY_STATIC) | `4f427724561e48f682d4a7c6153d7124` |
| D1 database | `8d0b8373-40ea-4174-bfd9-628b790abf92` |
| sly-deploy relay URL | `https://sly-deploy.pgallivan.workers.dev/deploy/sly-app` |
| Old Supabase (read-only) | `hzkodmxrranessgbjjjl` |
| Vercel team (orphaned) | `team_qXLAiOqq0EztMXKK8CXX6JhT` |
| GitHub repo | `LuckDragonAsgard/superleague-yeah-v4` |

Secret keys (all in asgard-vault, X-Pin auth):
- `CF_API_TOKEN` — Cloudflare workers token (deploy)
- `SLY_DEPLOY_SECRET` — bearer for sly-deploy relay
- `GITHUB_TOKEN` — for gh-push worker (lives in worker env, callers don't pass it)

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

---

## Standing rules (Paddy's instructions)

- Never ask Paddy to do dashboard work. Always deploy/configure via API/code.
- Never write to the old Supabase site (`hzkodmxrranessgbjjjl`).
- Coaches must NEVER need a refresh — MutationObserver + 2.5s setInterval handles that.
- Old site (`superleagueyeah.online`) stays untouched as fallback.
- Gold tier is `$50` (not $20).
- Save all NEW code to GitHub via gh-push relay. Drive is only for the local hand-edit copy and Office files.
- Use paddy@luckdragon.io Drive (not pgallivan@outlook.com — global CLAUDE.md is stale).
- "Sort out all popups without asking me" — global instruction.

---

## Memory pointers for next Claude account

If conversation rolls to a 4th account, save these as memory on day one