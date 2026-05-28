#!/usr/bin/env bash
# CMR — Master deployment script for a Hostinger-style single-VPS setup.
#
# What it does, in order:
#   1. Validate the environment (.env present, required vars filled)
#   2. Bring up the core stack (postgres, redis, minio) and wait for health
#   3. Apply Prisma migrations
#   4. Seed the initial admin user (only if --seed is passed; safe to skip)
#   5. Build + start api + web
#   6. Bring up Traefik so HTTPS works
#   7. Smoke-test the public endpoints
#
# Idempotent: re-running upgrades the stack without resetting data.
#
# Usage:
#   ./infra/scripts/deploy-vps.sh                  # update / re-deploy
#   ./infra/scripts/deploy-vps.sh --seed           # first time only: create admin
#   ./infra/scripts/deploy-vps.sh --pull           # also pull base images
#
set -euo pipefail

cd "$(dirname "$0")/../.."   # repo root
ROOT="$PWD"

SEED=false
PULL=false
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    --pull) PULL=true ;;
    *)      echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

bold() { printf "\033[1m▶ %s\033[0m\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
ko()   { printf "  \033[31m✗\033[0m %s\n" "$*"; exit 1; }

# ──────────────────────────────────────────────────────────────────────────────
# 1. Pre-flight checks
# ──────────────────────────────────────────────────────────────────────────────
bold "Pre-flight checks"

[ -f .env ] || ko "Missing .env at $ROOT/.env — copy .env.production.template and fill it in"
[ -f docker-compose.override.yml ] || {
  if [ -f docker-compose.override.yml.example ]; then
    cp docker-compose.override.yml.example docker-compose.override.yml
    ok "Created docker-compose.override.yml from example"
  else
    ko "Missing docker-compose.override.yml"
  fi
}

source .env
for v in DOMAIN LETSENCRYPT_EMAIL POSTGRES_PASSWORD JWT_SECRET CORS_ORIGIN NEXT_PUBLIC_API_URL; do
  [ -n "${!v:-}" ] || ko "Required env var $v is empty in .env"
done

# Sanity-check JWT_SECRET length (must be ≥ 64 chars in production).
if [ "${#JWT_SECRET}" -lt 64 ]; then
  ko "JWT_SECRET must be ≥ 64 chars (got ${#JWT_SECRET}). Run: openssl rand -hex 64"
fi
ok "All required env vars present"

# Confirm DNS A records resolve to this host. If they don't, Let's Encrypt
# will fail and Traefik will keep retrying.
THIS_IP=$(curl -fs https://api.ipify.org 2>/dev/null || echo "")
if [ -n "$THIS_IP" ]; then
  for h in "$DOMAIN" "api.$DOMAIN"; do
    RESOLVED=$(dig +short "$h" A 2>/dev/null | tail -n1 || echo "")
    if [ "$RESOLVED" = "$THIS_IP" ]; then
      ok "DNS $h → $RESOLVED ✓"
    else
      printf "  \033[33m⚠\033[0m DNS %s resolves to '%s' (expected this VPS: %s)\n" "$h" "$RESOLVED" "$THIS_IP"
      printf "    Let's Encrypt will fail until DNS propagates. Continue anyway? [y/N] "
      read -r answer
      [ "$answer" = "y" ] || exit 1
    fi
  done
fi

# ──────────────────────────────────────────────────────────────────────────────
# 2. Pull / build images
# ──────────────────────────────────────────────────────────────────────────────
if [ "$PULL" = true ]; then
  bold "Pulling base images"
  docker compose pull postgres redis minio
fi

bold "Building app images"
docker compose --profile app build --pull

# ──────────────────────────────────────────────────────────────────────────────
# 3. Core services + wait for health
# ──────────────────────────────────────────────────────────────────────────────
bold "Starting core services (Postgres, Redis, MinIO)"
docker compose up -d postgres redis minio

bold "Waiting for Postgres to be healthy"
for i in {1..30}; do
  if docker compose ps postgres --format json | grep -q '"Health":"healthy"'; then
    ok "Postgres healthy"
    break
  fi
  sleep 2
  [ "$i" = 30 ] && ko "Postgres failed to become healthy"
done

# ──────────────────────────────────────────────────────────────────────────────
# 4. Migrations + seed
# ──────────────────────────────────────────────────────────────────────────────
bold "Applying Prisma migrations"
docker compose run --rm --no-deps api sh -c \
  "cd /app && pnpm --filter @cmr/db exec prisma migrate deploy"
ok "Migrations applied"

if [ "$SEED" = true ]; then
  bold "Seeding initial admin user (first-time deploy)"
  docker compose run --rm --no-deps api sh -c \
    "cd /app && pnpm --filter @cmr/db exec prisma db seed" \
    || printf "  \033[33m⚠\033[0m Seed already applied or no seed configured (skipping)\n"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 5. App tier (API + Web)
# ──────────────────────────────────────────────────────────────────────────────
bold "Starting API + Web"
docker compose --profile app up -d api web

# ──────────────────────────────────────────────────────────────────────────────
# 6. Traefik (HTTPS termination)
# ──────────────────────────────────────────────────────────────────────────────
bold "Starting Traefik (Let's Encrypt SSL)"
docker compose -f infra/traefik/docker-compose.traefik.yml up -d
ok "Traefik up"

bold "Waiting for cert issuance (up to 60s)"
for i in {1..30}; do
  if curl -fsS --max-time 5 "https://$DOMAIN/" -o /dev/null 2>/dev/null; then
    ok "HTTPS up on https://$DOMAIN"
    break
  fi
  sleep 2
  [ "$i" = 30 ] && printf "  \033[33m⚠\033[0m HTTPS not yet responsive — check 'docker logs cmr-traefik'\n"
done

# ──────────────────────────────────────────────────────────────────────────────
# 7. Smoke test
# ──────────────────────────────────────────────────────────────────────────────
bold "Running smoke test against the live HTTPS endpoints"
if API_BASE_URL="https://api.$DOMAIN/api" WEB_BASE_URL="https://$DOMAIN" \
   bash "$ROOT/infra/scripts/smoke.sh"; then
  ok "Smoke test PASSED"
else
  printf "  \033[33m⚠\033[0m Smoke test had failures — investigate before announcing GA\n"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────────────
echo
echo "═══════════════════════════════════════════════════════════════════════"
echo "🎉 CMR is live"
echo "═══════════════════════════════════════════════════════════════════════"
echo "  Web      : https://$DOMAIN"
echo "  API      : https://api.$DOMAIN/api"
echo "  Swagger  : https://api.$DOMAIN/api/docs"
echo "  Health   : https://api.$DOMAIN/api/health"
echo
echo "Next steps:"
echo "  1. Install daily backups :  sudo ./infra/backup/install-cron.sh"
echo "  2. Harden the host       :  sudo ./infra/firewall/setup-ufw.sh"
echo "  3. Test login            :  https://$DOMAIN  (use \$SEED_PASSWORD from .env)"
echo "  4. Add Anthropic key     :  edit .env then ./deploy-vps.sh"
echo
