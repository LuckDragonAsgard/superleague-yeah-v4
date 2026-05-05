#!/usr/bin/env python3
"""SLY post-deploy smoke tests.

Run after every sly-app or sly-api deploy. Catches the bug classes that
have bitten this project before:
  - version mismatch / reload loops
  - broken serve-time patch anchors
  - missing bindings (D1, KV)
  - cron schedules drifting
  - auth holes on mutation endpoints
  - logo rendering (jumper class of bugs)

Usage: python3 sly-checks.py
Exit 0 = all green, exit 1 = any red.

PIN expected via env SLY_PIN, defaults to vault fetch.
"""
import json, os, re, subprocess, sys, urllib.request, urllib.error

APP = "https://superleague.streamlinewebapps.com"
API = "https://sly-api.luckdragon.io"
ACCT = "a6f47c17811ee2f8b6caeb8f38768c20"
KV_NS = "4f427724561e48f682d4a7c6153d7124"
D1_ID = "8d0b8373-40ea-4174-bfd9-628b790abf92"
CRONS = {
    "sly-score-cron": "*/1 * * * *",
    "sly-autopick-cron": "*/15 * * * *",
    "sly-notify-cron": None,  # Thursday reminders, multiple schedules
}
# Auth probes: send EMPTY/MALFORMED bodies so the request never writes to D1
# regardless of whether auth gates are missing. We're checking the *response*:
#  - 401/403 with API JSON error → gated (good)
#  - 200 → no gate (bad — auth hole)
#  - 400 → no gate, request reached body-validation layer (also bad — auth hole)
MUTATION_ENDPOINTS = [
    ("POST", "/api/_admin/replace", '{}'),
    ("POST", "/api/picks/_bulk",   '{}'),
    ("POST", "/api/scores",        '[]'),
    ("POST", "/api/stats",         '[]'),
    ("POST", "/api/messages",      '{}'),
    ("POST", "/api/picks",         '{}'),
]

results = []
def ok(msg):   results.append(("✅", msg))
def fail(msg): results.append(("❌", msg))
def warn(msg): results.append(("⚠️ ", msg))

def http_get(url, headers=None, timeout=10):
    req = urllib.request.Request(url, headers={"User-Agent": "sly-checks/1.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode()

def http(method, url, body=None, headers=None, timeout=10):
    h = {"Content-Type": "application/json", "User-Agent": "sly-checks/1.0"}; h.update(headers or {})
    req = urllib.request.Request(url, data=(body.encode() if body else None), method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode() if e.fp else ""

def get_pin():
    return os.environ.get("SLY_PIN") or "535554"

def get_cf_token():
    if "CF_API_TOKEN" in os.environ: return os.environ["CF_API_TOKEN"]
    s, b = http_get(f"https://asgard-vault.luckdragon.io/secret/CF_API_TOKEN", {"X-Pin": get_pin()})
    return b.strip()

# ---- Check 1: version coherence (the reload-loop class) ----
def check_version_coherence():
    s, html = http_get(f"{APP}/?_check=1")
    if s != 200:
        fail(f"version: app returned {s}"); return
    s2, ver = http_get(f"{APP}/_version")
    if s2 != 200:
        fail(f"version: /_version returned {s2}"); return
    endpoint_v = json.loads(ver).get("v")
    baked = re.search(r'var V="(v[0-9.]+)"', html)
    meta  = re.search(r'name="sly-app-version" content="(v[0-9.]+)"', html)
    if not baked: fail("version: no var V in served HTML"); return
    if not meta:  fail("version: no meta tag in served HTML"); return
    if baked.group(1) != endpoint_v or meta.group(1) != endpoint_v:
        fail(f"version mismatch — V={baked.group(1)} meta={meta.group(1)} /_version={endpoint_v} (RELOAD LOOP RISK)")
    else:
        ok(f"version coherent: {endpoint_v}")

# ---- Check 2: bindings still attached ----
def check_bindings():
    tok = get_cf_token()
    for worker, expect in [("sly-app", ("kv_namespace", "SLY_STATIC", KV_NS)),
                           ("sly-api", ("d1", "DB", D1_ID))]:
        s, b = http_get(f"https://api.cloudflare.com/client/v4/accounts/{ACCT}/workers/scripts/{worker}/bindings",
                        {"Authorization": f"Bearer {tok}"})
        rows = json.loads(b).get("result", [])
        kind, name, ident = expect
        match = next((r for r in rows if r.get("type")==kind and r.get("name")==name), None)
        if not match: fail(f"bindings: {worker} missing {kind} {name}")
        elif (match.get("namespace_id") or match.get("id")) != ident:
            fail(f"bindings: {worker}.{name} id wrong: {match.get('namespace_id') or match.get('id')}")
        else:
            ok(f"bindings: {worker}.{name} ✓")

# ---- Check 3: cron schedules ----
def check_crons():
    tok = get_cf_token()
    for worker, expect in CRONS.items():
        s, b = http_get(f"https://api.cloudflare.com/client/v4/accounts/{ACCT}/workers/scripts/{worker}/schedules",
                        {"Authorization": f"Bearer {tok}"})
        scheds = json.loads(b).get("result", {}).get("schedules", []) if 200 <= s < 300 else []
        crons = [x.get("cron") for x in scheds]
        if not crons: fail(f"cron: {worker} has no schedules"); continue
        if expect and expect not in crons: fail(f"cron: {worker} expected {expect} got {crons}")
        else: ok(f"cron: {worker} → {','.join(crons)}")

# ---- Check 4: mutation endpoints require auth ----
def check_auth_gates():
    for method, path, body in MUTATION_ENDPOINTS:
        code, body_resp = http(method, f"{API}{path}", body=body)
        # Only count it gated if the API itself said so (JSON error). CF firewall 403 doesn't prove auth.
        api_said_auth = False
        try:
            j = json.loads(body_resp)
            if isinstance(j, dict) and j.get("error") and any(k in (j.get("error","").lower()) for k in ["unauth","forbidden","pin","token","auth","admin access","admin only"]):
                api_said_auth = True
        except Exception: pass
        if code in (401, 403) and api_said_auth:
            ok(f"auth: {method} {path} → {code} gated by API")
        elif code in (400,):
            fail(f"auth: {method} {path} → 400 (request reached body-validation w/o auth gate — HOLE): {body_resp[:60]}")
        elif code == 200:
            fail(f"auth: {method} {path} → 200 UNAUTHENTICATED (HOLE)")
        elif code in (401, 403):
            warn(f"auth: {method} {path} → {code} non-JSON body: {body_resp[:60]}")
        else:
            warn(f"auth: {method} {path} → {code} (inconclusive): {body_resp[:80]}")

# ---- Check 5: serve-time patch effects ----
def check_patch_effects():
    s, html = http_get(f"{APP}/?_check=2")
    expected = [
        ("OUTSTANDING column",       "OUTSTANDING"),
        ("AUTOPICK TAB section",     "AUTOPICK TAB"),
        ("Autopick $5 modal",        "owe SLY $5"),
        ("Private message label",    "Private message"),
        ("Light-mode chat CSS",      "body.light-mode #pageChat"),
        ("Rules tab",                'data-page="pageRules"'),
        ("Every-player rule",        "EVERY-PLAYER RULE"),
        ("Pick usage widget",        "pickUsageWidget"),
        ("Crossorigin on logos",     'crossorigin="anonymous" class="coach-logo-img"'),
        ("White-strip threshold raised", "wCnt/(px.length/4)>0.985"),
        ("Auto-refresh poller",      "/_version?n="),
    ]
    for label, marker in expected:
        if marker in html: ok(f"patch: {label}")
        else: fail(f"patch: {label} — marker '{marker[:30]}' missing in served HTML")

# ---- Check 6: jumper rendering — sample a logo, count white pixels post-strip ----
def check_jumper_health():
    # Lightweight: just check /api/coaches returns 16, all have logo_url, all return 200.
    s, b = http_get(f"{API}/api/coaches")
    coaches = json.loads(b)
    if len(coaches) != 16: fail(f"coaches: got {len(coaches)} expected 16"); return
    missing = [c["name"] for c in coaches if not c.get("logo_url")]
    if missing: fail(f"jumpers: missing logo_url for {missing}"); return
    bad = []
    import urllib.request
    for c in coaches:
        try:
            req = urllib.request.Request(c["logo_url"], method="HEAD")
            with urllib.request.urlopen(req, timeout=5) as r:
                if r.status >= 400: bad.append((c["name"], r.status))
        except Exception as e: bad.append((c["name"], str(e)[:40]))
    if bad: fail(f"jumpers: logo HEAD failed for {bad}")
    else: ok(f"jumpers: 16/16 logo_urls reachable")

# ---- Check 7: D1 row counts haven't tanked ----
def check_data_health():
    s, b = http_get(f"{API}/api/coaches"); ok(f"coaches: {len(json.loads(b))}") if 200<=s<300 and len(json.loads(b))==16 else fail(f"coaches API: {s}")
    s, b = http_get(f"{API}/api/rounds")
    rs = json.loads(b)
    if not isinstance(rs, list) or len(rs) < 8: fail(f"rounds: got {len(rs) if isinstance(rs,list) else '?'}")
    else: ok(f"rounds: {len(rs)} rows")
    s, b = http_get(f"{API}/api/scores"); ok(f"scores: {len(json.loads(b))} rows")


# Known truth (scraped from old site superleagueyeah.online 2026-05-04).
# If D1 ever drifts from these for a completed historical round, something
# overwrote the backfill — likely the cron forgot the is_complete guard.
HISTORICAL_TRUTH = {
    8: [("Josh",187),("Cammy",202),("Tanka",110.5),("A Smith",173),("Dane",185),("Andy",166.5),
        ("Flags",170),("Age",159),("Libba",167.5),("Isaac",155),("Fraser",176),("MDT",106),
        ("Jack",167.5),("Cram",150.5),("Joe",131),("Georgrick",193)],
    7: [("Josh",259),("Tanka",182),("Cammy",125.5),("Dane",165),("Fraser",119.5),("A Smith",222),
        ("Jack",176.5),("Age",94),("Flags",154),("Isaac",219),("Cram",154.5),("Andy",177.5),
        ("Libba",191),("MDT",185),("Joe",124),("Georgrick",153)],
}

def check_score_drift():
    if not HISTORICAL_TRUTH: return
    for round_num, expected in HISTORICAL_TRUTH.items():
        try:
            s, b = http_get(f"{API}/api/scores?round={round_num}")
            d1 = {r["coach_id"]: r for r in json.loads(b)}
            # need name lookup
            s2, b2 = http_get(f"{API}/api/coaches")
            id_by_name = {c["name"]: c["id"] for c in json.loads(b2)}
            for name, expected_pts in expected:
                cid = id_by_name.get(name)
                if cid is None: warn(f"score drift R{round_num}: coach '{name}' not found"); continue
                row = d1.get(cid)
                if not row: fail(f"score drift R{round_num}: no score row for {name}"); continue
                actual = float(row.get("points", -1))
                if abs(actual - expected_pts) > 0.01:
                    fail(f"score drift R{round_num}: {name} D1={actual} truth={expected_pts}")
        except Exception as e: fail(f"score_drift R{round_num}: {e}")
    if not [r for r in results if r[0] == "FAIL" and "score drift" in r[1]]:
        ok(f"score drift: R{','.join(str(r) for r in HISTORICAL_TRUTH)} match scraped truth")



def check_finals_readiness():
    """Verify finals fixtures are populated when their feeder round is complete."""
    try:
        s, b = http_get(f"{API}/api/rounds")
        rounds = json.loads(b)
        completed = {r['round_number'] for r in rounds if r.get('is_complete')}
        # Each finals round should have fixtures iff the previous round is complete
        finals_chain = [(20, 21, 4), (21, 22, 2), (22, 23, 2), (23, 24, 1)]
        for feeder, target, expected_count in finals_chain:
            if feeder in completed:
                # target round should have fixtures
                s2, b2 = http_get(f"{API}/api/sly-fixtures?round={target}")
                got = len(json.loads(b2))
                if got == expected_count: ok(f"finals: R{target} ({expected_count} fixtures) ready after R{feeder} complete")
                elif got == 0: fail(f"finals: R{feeder} complete but R{target} has 0 fixtures (run /api/finals/generate)")
                else: warn(f"finals: R{target} expected {expected_count} fixtures, got {got}")
        if not any(f in completed for f, _, _ in finals_chain):
            ok("finals: regular season not finished — finals not yet due")
    except Exception as e:
        fail(f"finals_readiness: {e}")


# ---- Run all ----
def main():
    print("\n=== SLY post-deploy checks ===\n")
    for fn in [check_version_coherence, check_bindings, check_crons,
               check_auth_gates, check_patch_effects, check_jumper_health,
               check_data_health, check_score_drift, check_finals_readiness]:
        try: fn()
        except Exception as e: fail(f"{fn.__name__}: {e}")
    fails = sum(1 for s,_ in results if s=="❌")
    warns = sum(1 for s,_ in results if s.strip()=="⚠️")
    for s, m in results: print(f"  {s} {m}")
    print(f"\n{fails} fail / {warns} warn / {len(results)-fails-warns} pass\n")
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
