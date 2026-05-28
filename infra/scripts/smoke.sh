#!/usr/bin/env bash
# Post-deploy smoke test — invoked from the go-live runbook and CI.
#
# Verifies: API is reachable, returns the expected RFC 7807 envelope on errors,
# RBAC enforcement is wired, and the Helmet security headers shipped.
#
# Usage:
#   API_BASE_URL=https://api.cmr.tv ./infra/scripts/smoke.sh
#   WEB_BASE_URL=https://app.cmr.tv ./infra/scripts/smoke.sh
#
# Exits non-zero on any failed assertion.
set -euo pipefail

API="${API_BASE_URL:-http://localhost:4001/api}"
WEB="${WEB_BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
ko()   { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
section() { echo; echo "▶ $1"; }

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then ok "$label ($actual)"; else ko "$label (expected '$expected', got '$actual')"; fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then ok "$label"; else ko "$label (missing: $needle)"; fi
}

echo "=== CMR smoke test ==="
echo "API: $API"
echo "Web: $WEB"

section "Liveness & readiness"
code=$(curl -s -o /tmp/.smoke.body -w "%{http_code}" "$API/health")
assert_eq "GET /api/health → 200" "200" "$code"
assert_contains "health body has ok=true" '"ok":true' "$(cat /tmp/.smoke.body)"

code=$(curl -s -o /tmp/.smoke.body -w "%{http_code}" "$API/health/ready")
assert_eq "GET /api/health/ready → 200" "200" "$code"

section "Security headers (API)"
headers=$(curl -sI "$API/health")
assert_contains "X-Request-Id present"    "X-Request-Id"            "$headers"
assert_contains "X-Content-Type-Options"  "X-Content-Type-Options"  "$headers"
assert_contains "Referrer-Policy"         "Referrer-Policy"         "$headers"
assert_contains "x-powered-by removed"    ""                        "" # placeholder asserted below
if echo "$headers" | grep -qi "x-powered-by"; then ko "x-powered-by should NOT be present"; else ok "x-powered-by stripped"; fi

section "RFC 7807 problem+json envelope"
code=$(curl -s -o /tmp/.smoke.body -w "%{http_code}" "$API/this-endpoint-does-not-exist")
assert_eq "GET unknown route → 404" "404" "$code"
body=$(cat /tmp/.smoke.body)
assert_contains "problem.type"         '"type":"'         "$body"
assert_contains "problem.status=404"   '"status":404'     "$body"
assert_contains "problem.requestId"    '"requestId":"'    "$body"

section "Validation pipeline (DTO + 400)"
code=$(curl -s -o /tmp/.smoke.body -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"email":"x"}' "$API/auth/login")
assert_eq "POST /auth/login bad payload → 400" "400" "$code"
assert_contains "validation errors flattened" '"errors"' "$(cat /tmp/.smoke.body)"

section "RBAC default (auth required)"
code=$(curl -s -o /dev/null -w "%{http_code}" "$API/users")
assert_eq "GET /users without bearer → 401" "401" "$code"

section "Web frontend"
code=$(curl -s -o /dev/null -w "%{http_code}" "$WEB/")
assert_eq "GET / → 200" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" "$WEB/dashboard")
assert_eq "GET /dashboard → 200" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" "$WEB/whatever-not-existing")
assert_eq "GET /404 → 404 custom" "404" "$code"

section "Result"
echo
if [ "$FAIL" -gt 0 ]; then
  echo "❌ Smoke FAILED — passed=$PASS failed=$FAIL"
  exit 1
fi
echo "✅ Smoke PASSED — $PASS assertions"
