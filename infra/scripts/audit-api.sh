#!/usr/bin/env bash
# Module-by-module API endpoint audit.
#
# For each endpoint, exercises three cases:
#   - no auth     → expects 401 (sanity: guard is wired)
#   - admin auth  → expects 2xx (functional health check)
#   - read-only role (journalist) on admin-only endpoints → expects 403 (RBAC)
#
# Run after `pnpm --filter @cmr/api dev` is up.
set -euo pipefail

API="${API:-http://localhost:4001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-e.rousseau@cmr.tv}"
ADMIN_PWD="${ADMIN_PWD:-cmr2025!Dev}"

PASS=0
FAIL=0
FAIL_LIST=""

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
ko()   { echo "  ❌ $1"; FAIL=$((FAIL+1)); FAIL_LIST="$FAIL_LIST\n  ❌ $1"; }
hdr()  { echo; echo "▶ $1"; }

# Wait for /auth/login throttle if it's been hit recently.
echo "Acquiring admin token…"
for i in 1 2 3 4 5; do
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PWD\"}")
  CODE=$(echo "$RESP" | tail -n1)
  BODY=$(echo "$RESP" | sed '$d')
  if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then break; fi
  echo "  attempt $i: HTTP $CODE — sleeping 15s"
  sleep 15
done
[ "$CODE" = "201" ] || [ "$CODE" = "200" ] || { echo "❌ Could not obtain admin token (HTTP $CODE)"; exit 1; }
ADMIN_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "✓ Admin token acquired (${#ADMIN_TOKEN} chars)"

# Forge a journalist-role JWT to test RBAC denial. We sign with JWT_SECRET so
# the API accepts the signature; the role mismatch is what should trigger 403.
JWT_SECRET="${JWT_SECRET:-dev_only_min_64_chars_MEDIA_IA_local_secret_change_before_production_2026}"
JOURNALIST_TOKEN=$(python3 - <<PY
import hmac, hashlib, json, base64, time
def b64(s): return base64.urlsafe_b64encode(s).rstrip(b"=").decode()
header = b64(json.dumps({"alg":"HS512","typ":"JWT"}).encode())
now = int(time.time())
payload = b64(json.dumps({"sub":"forged-journalist","email":"fake@cmr.tv","role":"journalist","name":"Fake","iat":now,"exp":now+3600}).encode())
signing_input = f"{header}.{payload}".encode()
sig = hmac.new("$JWT_SECRET".encode(), signing_input, hashlib.sha512).digest()
print(f"{header}.{payload}.{b64(sig)}")
PY
)

ENDPOINTS_PUBLIC_OR_AUTH=(
  "GET /api/health"               # public, expect 200
  "GET /api/health/ready"         # public, expect 200
  "GET /api/metrics"              # public, expect 200
  "GET /api/auth/me"              # requires auth
  "GET /api/contents"             # requires auth, all roles read
  "GET /api/contents/pending"     # auth
  "GET /api/kpis"                 # auth
  "GET /api/kpis/platforms"       # auth
  "GET /api/activity"             # auth
  "GET /api/audience?range=30d"   # auth
  "GET /api/notifications"        # auth
  "GET /api/media"                # auth
  "GET /api/calendar"             # auth
  "GET /api/analytics/deep"       # auth (admin or community_manager)
  "GET /api/diffusion/matrix"     # auth (admin or community_manager)
  "GET /api/audit"                # admin only
  "GET /api/users"                # admin only
  "GET /api/workflows"            # editor+
  "GET /api/automations"          # admin only
)

ADMIN_ONLY=(
  "/api/audit"
  "/api/users"
  "/api/automations"
)

hdr "Public endpoints (no auth required)"
for ep in "/api/health" "/api/health/ready" "/api/metrics"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API$ep")
  if [ "$CODE" = "200" ]; then ok "GET $ep → $CODE"; else ko "GET $ep → $CODE (expected 200)"; fi
done

hdr "Unauthenticated → 401 (guard wired correctly)"
for ep in "/api/auth/me" "/api/contents" "/api/users" "/api/audit"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API$ep")
  if [ "$CODE" = "401" ]; then ok "GET $ep w/o auth → 401"; else ko "GET $ep w/o auth → $CODE (expected 401)"; fi
done

hdr "Admin authenticated → 2xx (functional)"
for ep_spec in "${ENDPOINTS_PUBLIC_OR_AUTH[@]}"; do
  METHOD=$(echo "$ep_spec" | cut -d' ' -f1)
  EP=$(echo "$ep_spec" | cut -d' ' -f2)
  CODE=$(curl -s -o /tmp/.api-body -w "%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" -X "$METHOD" "$API$EP")
  if [ "$CODE" -ge 200 ] && [ "$CODE" -lt 300 ]; then
    # Spot-check that the body is JSON (or empty) and not an error envelope
    BODY=$(head -c 200 /tmp/.api-body)
    if echo "$BODY" | grep -q '"problem"\|"type":"https://cmr.tv/problems'; then
      ko "$METHOD $EP → $CODE but body looks like problem+json"
    else
      ok "$METHOD $EP → $CODE"
    fi
  else
    ko "$METHOD $EP → $CODE (expected 2xx as admin)"
  fi
done

hdr "Journalist role → 403 on admin-only endpoints (RBAC)"
for ep in "${ADMIN_ONLY[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $JOURNALIST_TOKEN" "$API$ep")
  if [ "$CODE" = "403" ]; then ok "GET $ep as journalist → 403"; else ko "GET $ep as journalist → $CODE (expected 403)"; fi
done

hdr "Security headers"
H=$(curl -sI "$API/api/health")
echo "$H" | grep -qi "x-content-type-options" && ok "X-Content-Type-Options present" || ko "X-Content-Type-Options missing"
echo "$H" | grep -qi "x-frame-options" && ok "X-Frame-Options present" || ko "X-Frame-Options missing"
echo "$H" | grep -qi "x-powered-by" && ko "x-powered-by leaked" || ok "x-powered-by stripped"

hdr "RFC 7807 problem+json envelope"
BODY=$(curl -s "$API/api/this-route-does-not-exist")
echo "$BODY" | grep -q '"type":"https://cmr.tv/problems' && ok "404 returns problem.type" || ko "404 missing problem.type"
echo "$BODY" | grep -q '"requestId":"' && ok "404 includes requestId" || ko "404 missing requestId"

BODY=$(curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" -d '{"email":"x"}')
echo "$BODY" | grep -q '"errors":' && ok "400 flattens validator messages" || ko "400 missing errors map"

hdr "CORS allow-list (LAN origin must be enumerated)"
RESP=$(curl -s -i -X OPTIONS "$API/api/health" -H "Origin: http://192.168.1.166:3001" -H "Access-Control-Request-Method: GET")
echo "$RESP" | grep -q "Access-Control-Allow-Origin: http://192.168.1.166:3001" \
  && ok "LAN origin allowed by allowlist" \
  || ko "LAN origin NOT in CORS allow-list (run with .env updated)"

# Untrusted origin should be rejected
RESP=$(curl -s -i -X OPTIONS "$API/api/health" -H "Origin: https://evil.example.com" -H "Access-Control-Request-Method: GET" 2>&1)
echo "$RESP" | grep -q "Access-Control-Allow-Origin: https://evil.example.com" \
  && ko "Untrusted origin was allowed (CORS misconfig)" \
  || ok "Untrusted origin rejected"

echo
echo "===== SUMMARY ====="
echo "✅ Passed : $PASS"
echo "❌ Failed : $FAIL"
[ "$FAIL" -gt 0 ] && echo -e "Failures:$FAIL_LIST"
[ "$FAIL" -eq 0 ] && echo "🎉 All API audits PASSED"
exit "$FAIL"
