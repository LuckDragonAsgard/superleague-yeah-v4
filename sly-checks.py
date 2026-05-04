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
MUTATION_ENDPOINTS = [
    ("POST", "/api/_admin/replace", '{"table":"injury_list","rows":[{"player_id":"_check","injury":"x","estimated_return":""}]}'),
    ("POST", "/api/picks/_bulk",   '{"rows":[{"round_id":1,"coach_id":1,"player_id":"_check","slot":"D1"}]}'),
    ("POST", "/api/scores",        '[{"coach_id":99999,"round_id":99999,"points":1}]'),
    ("POST", "/api/stats",         '[{"player_id":"_check","round_id":99999,"fantasy_pts":1}]'),
    ("POST", "/api/messages",      '{"coach_id":1,"content":"_sly_checks_probe"}'),
    ("POST", "/api/picks",         '{"round_number":99,"coach_id":1,"picks":[]}'),
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
            if isinstance(j, dict) and j.get("error") and any(k in (j.get("error","").lower()) for k in ["unauth","forbidden","pin","token","auth"]):
                api_said_auth = True
        except Exception: pass
        if code in (401, 403) and api_said_auth:
            ok(f"auth: {method} {path} → {code} gated by API")
        elif code == 200:
            fail(f"auth: {method} {path} → 200 UNAUTHENTICATED (HOLE)")
        elif code in (401, 403):
            warn(f"auth: {method} {path} → {code} but body wasn't auth-error JSON: {body_resp[:60]}")
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

# ---- Run all ----
def main():
    print("\n=== SLY post-deploy checks ===\n")
    for fn in [check_version_coherence, check_bindings, check_crons,
               check_auth_gates, check_patch_effects, check_jumper_health,
               check_data_health]:
        try: fn()
        except Exception as e: fail(f"{fn.__name__}: {e}")
    fails = sum(1 for s,_ in results if s=="❌")
    warns = sum(1 for s,_ in results if s.strip()=="⚠️")
    for s, m in results: print(f"  {s} {m}")
    print(f"\n{fails} fail / {warns} warn / {len(results)-fails-warns} pass\n")
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
