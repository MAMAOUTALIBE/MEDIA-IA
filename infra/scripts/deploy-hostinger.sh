#!/usr/bin/env bash
# CMR — Déploiement Hostinger en une commande.
#
# Usage (depuis ton Mac, à la racine du repo) :
#   ./infra/scripts/deploy-hostinger.sh              # update / rebuild + restart
#   ./infra/scripts/deploy-hostinger.sh --no-build   # pas de rebuild (juste restart)
#   ./infra/scripts/deploy-hostinger.sh --seed       # premier deploy : crée l'admin
#
# Configuration via variables d'env :
#   VPS_HOST   (défaut: 187.127.228.197)
#   VPS_USER   (défaut: root)
#   VPS_PATH   (défaut: /opt/cmr)

set -euo pipefail

VPS_HOST="${VPS_HOST:-187.127.228.197}"
VPS_USER="${VPS_USER:-root}"
VPS_PATH="${VPS_PATH:-/opt/cmr}"

BUILD=true
SEED=false
for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=false ;;
    --seed)     SEED=true ;;
    *)          echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

bold() { printf "\033[1m▶ %s\033[0m\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
warn() { printf "  \033[33m⚠\033[0m %s\n" "$*"; }
ko()   { printf "  \033[31m✗\033[0m %s\n" "$*"; exit 1; }

cd "$(dirname "$0")/../.."   # racine repo

# ──────────────────────────────────────────────────────────────────────────────
# 1. Sanity checks locaux
# ──────────────────────────────────────────────────────────────────────────────
bold "Pre-flight checks"
[ -f docker-compose.yml ] || ko "docker-compose.yml introuvable (es-tu à la racine du repo ?)"
[ -d infra/nginx-proxy ] || ko "infra/nginx-proxy/ manquant (configs reverse-proxy)"
[ -f infra/nginx-proxy/api.conf ] || ko "infra/nginx-proxy/api.conf manquant"
[ -f infra/nginx-proxy/web.conf ] || ko "infra/nginx-proxy/web.conf manquant"

# Test SSH
ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" 'echo ok' >/dev/null 2>&1 || \
  ko "SSH vers $VPS_USER@$VPS_HOST échoue — configure ta clé (voir docs/DEPLOY-HOSTINGER.md §0)"
ok "SSH OK"

# ──────────────────────────────────────────────────────────────────────────────
# 2. Sync code Mac → VPS
# ──────────────────────────────────────────────────────────────────────────────
bold "Sync code → $VPS_USER@$VPS_HOST:$VPS_PATH"
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .turbo \
  --exclude dist \
  --exclude .git \
  --exclude .env \
  --exclude docker-compose.override.yml \
  --exclude '*.bak.*' \
  ./ "$VPS_USER@$VPS_HOST:$VPS_PATH/" 2>&1 | tail -5
ok "Code synced"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Verify .env present on VPS
# ──────────────────────────────────────────────────────────────────────────────
ssh "$VPS_USER@$VPS_HOST" "[ -f $VPS_PATH/.env ]" || \
  ko ".env absent sur le VPS — copie .env.production.template et remplis-le (voir docs/DEPLOY-HOSTINGER.md §3)"
ok ".env présent"

# ──────────────────────────────────────────────────────────────────────────────
# 4. Pas de docker-compose.override.yml (sinon pollution)
# ──────────────────────────────────────────────────────────────────────────────
if ssh "$VPS_USER@$VPS_HOST" "[ -f $VPS_PATH/docker-compose.override.yml ]"; then
  warn "docker-compose.override.yml présent sur le VPS — suppression (polluerait le compose)"
  ssh "$VPS_USER@$VPS_HOST" "rm $VPS_PATH/docker-compose.override.yml"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 5. Deploy
# ──────────────────────────────────────────────────────────────────────────────
if [ "$BUILD" = true ]; then
  bold "Build + restart (profile app)"
  ssh "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && docker compose --profile app up -d --build" 2>&1 | tail -15
else
  bold "Restart only (pas de rebuild)"
  ssh "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && docker compose --profile app up -d" 2>&1 | tail -15
fi
ok "Containers up"

# ──────────────────────────────────────────────────────────────────────────────
# 6. Wait for API ready + smoke test
# ──────────────────────────────────────────────────────────────────────────────
bold "Smoke test (max 60s d'attente)"
for i in {1..30}; do
  if curl -ks --max-time 5 https://api.cmr.gmd2025.org/api/health | grep -q '"ok":true'; then
    ok "API up : $(curl -ks https://api.cmr.gmd2025.org/api/health)"
    break
  fi
  sleep 2
  [ "$i" = 30 ] && warn "API ne répond pas après 60s — check 'docker logs cmr-api'"
done

# Web
WEB_TITLE=$(curl -ks --max-time 8 https://cmr.gmd2025.org/ | grep -oE '<title>[^<]+' | head -1)
[ -n "$WEB_TITLE" ] && ok "Web up : $WEB_TITLE" || warn "Web ne répond pas"

# ──────────────────────────────────────────────────────────────────────────────
# 7. Migrations + Seed (si demandés)
# ──────────────────────────────────────────────────────────────────────────────
if [ "$SEED" = true ]; then
  bold "Première fois : appliquer migrations + créer admin"
  ssh "$VPS_USER@$VPS_HOST" "
    docker exec -i cmr-api sh -c 'cd /app && pnpm --filter @cmr/db exec prisma db push --accept-data-loss' && \
    docker exec -i cmr-api node /app/admin-seed.js
  " 2>&1 | tail -10
  ok "DB seed terminé"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────────────
echo
echo "═══════════════════════════════════════════════════════════════════════"
echo "🚀 Déployé"
echo "═══════════════════════════════════════════════════════════════════════"
echo "  Web      : https://cmr.gmd2025.org"
echo "  Dashboard: https://cmr.gmd2025.org/dashboard"
echo "  API      : https://api.cmr.gmd2025.org/api/health"
echo "  Swagger  : https://api.cmr.gmd2025.org/api/docs"
echo
echo "Pour logs live :"
echo "  ssh $VPS_USER@$VPS_HOST 'docker logs -f cmr-api'"
echo "  ssh $VPS_USER@$VPS_HOST 'docker logs -f cmr-web'"
echo
