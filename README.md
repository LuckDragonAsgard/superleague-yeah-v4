# Superleague Yeah v4 — Cloudflare Worker source

**Live:** https://superleague.streamlinewebapps.com (green badge top-right shows live version)

**Source of truth:** this repo, `LuckDragonAsgard/superleague-yeah-v4`. Drive copies are deprecated.

## Files

| File | Purpose |
|---|---|
| `sly-app-v2.js` | The Cloudflare Worker that proxies `superleague.streamlinewebapps.com` and injects the patch script. |
| `sly-deploy.js` | Cloudflare Worker that accepts POST with raw JS body and pushes to CF as the `sly-app` worker. |
| `gh-push.js` | Cloudflare Worker that accepts POST and commits files to GitHub via `env.GITHUB_TOKEN`. |
| `docs/SUPERLEAGUE-HANDOVER-v4.28.md` | Comprehensive handover for next session. **Read this first.** |

## Deploy

```bash
curl -X POST "https://sly-deploy.pgallivan.workers.dev/deploy/sly-app" \
  -H "Authorization: Bearer $SLY_DEPLOY_SECRET" \
  -H "Content-Type: application/javascript" \
  --data-binary @sly-app-v2.js
```

`SLY_DEPLOY_SECRET` lives in asgard-vault.

## Secrets

All secrets live in `asgard-vault.pgallivan.workers.dev` (KV-backed). Never commit values to this repo — GitHub secret scanning will block the push.

Known secret keys:
- `CF_API_TOKEN` — Cloudflare workers token (deploy)
- `SLY_DEPLOY_SECRET` — bearer for sly-deploy relay
- `GITHUB_TOKEN` — for gh-push worker

## Live infrastructure

- CF account: `a6f47c17811ee2f8b6caeb8f38768c20`
- KV namespace `SLY_STATIC`: `4f427724561e48f682d4a7c6153d7124`
- D1 database: `8d0b8373-40ea-4174-bfd9-628b790abf92`
- API worker: `https://sly-api.pgallivan.workers.dev`
- App worker: `https://sly-app.pgallivan.workers.dev` (also at `superleague.streamlinewebapps.com`)
