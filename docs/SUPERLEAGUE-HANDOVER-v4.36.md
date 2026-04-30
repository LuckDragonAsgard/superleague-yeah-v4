# SUPERLEAGUE YEAH — v4.36 Handover

**Date:** 2026-05-01  
**Version:** v4.36  
**Status:** R8 open, picks window live

---

## What changed in v4.36

Five UX patches applied to `standalone-index.html` (KV-hosted SPA):

### 1. Fund tab — unpaid coaches highlighted red
- Unpaid rows now show red border (`#e74c3c`) + red background tint (`rgba(231,76,60,0.08)`)
- Previously used generic `var(--border)` — easy to miss

### 2. Lock countdown uses real lock_time
- `initCountdown()` was hardcoded to Thursday 19:20 every week
- Now reads `lock_time` from the open/upcoming round in `allRounds`
- Will correctly show countdown to actual R8 lock time from API

### 3. Activity feed player name fallback
- Trade entries with a missing player name would show blank
- Now falls back to `'a player'` if `playerIn.name` is empty

### 4. Fixtures auto-refresh when live
- When viewing a live round, `renderFixtures()` now re-runs every 60s
- Clears fixture cache for the round before re-fetching so scores update
- Interval is cleared when switching to a non-live round

### 5. Home page "who hasn't submitted" card
- When round is `open`, shows a red warning card listing coaches yet to submit
- Uses existing `picksByCoach` data already fetched by `loadHomePage()`
- Disappears automatically once all coaches are in

---

## R8 State

- Status: **open**
- Most coaches submitted — check home page card for stragglers
- Lock countdown banner now driven by real `lock_time` from DB

## Pending

- R8 scoring: run after weekend AFL games (same R7 formula)
- Fund payments: 0/16 paid — Paddy to mark via `PATCH /api/payments/:id`
- VOSS IN: white jersey now renders correctly; Fraser can optionally re-upload with transparent bg

## Architecture reminder

- `superleagueyeah.online` → Cloudflare Worker `sly-app-v2.js` → KV `standalone-index.html`
- API: `sly-api` Worker, D1 `8d0b8373-40ea-4174-bfd9-628b790abf92`
- KV namespace: `4f427724561e48f682d4a7c6153d7124`
