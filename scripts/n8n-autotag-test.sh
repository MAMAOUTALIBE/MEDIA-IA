#!/usr/bin/env bash
# =============================================================================
# CMR — Test n8n auto-tagging end-to-end
# =============================================================================
# Crée un draft en DB → attend que le cron n8n (5 min) le tague avec Llama
# 3.3 70B → affiche tags + summary générés → cleanup optionnel.
#
# Usage (depuis le VPS, en root) :
#   /opt/cmr/scripts/n8n-autotag-test.sh                          # défauts : titre/body fixes
#   /opt/cmr/scripts/n8n-autotag-test.sh "Mon titre" "Mon body"   # custom
#   /opt/cmr/scripts/n8n-autotag-test.sh --cleanup                # supprime tous les drafts ck_demo_*
#   /opt/cmr/scripts/n8n-autotag-test.sh --list                   # liste les drafts ck_demo_*
#
# Variables d'env optionnelles :
#   AUTHOR_ID   id du user auteur (défaut admin-seed-001)
#
# Pour accélérer le tagging (ne pas attendre le cron 5 min) :
#   Ouvre https://srv1643859.hstgr.cloud/workflow/5ggvvaZjRKHrm9ve
#   et clique "Execute workflow" — le script verra le draft tagué en quelques sec.
# =============================================================================
set -euo pipefail

bold() { printf "\033[1m▶ %s\033[0m\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
info() { printf "  \033[36mℹ\033[0m %s\n" "$*"; }
warn() { printf "  \033[33m⚠\033[0m %s\n" "$*"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$*"; exit 1; }

AUTHOR_ID="${AUTHOR_ID:-admin-seed-001}"
WORKFLOW_URL="https://srv1643859.hstgr.cloud/workflow/5ggvvaZjRKHrm9ve"

# Helper : SQL one-liner returning tab-separated rows without headers
sql_quiet() {
  docker exec -i cmr-pg psql -U cmr -d cmr_prod -tA -c "$1"
}

# --------------------------------------------------------------------------- #
# Mode --cleanup
# --------------------------------------------------------------------------- #
if [ "${1:-}" = "--cleanup" ]; then
  bold "Cleanup tous les drafts ck_demo_*"
  N=$(sql_quiet "SELECT COUNT(*) FROM \"Content\" WHERE id LIKE 'ck_demo_%';")
  info "$N draft(s) ck_demo_* à supprimer"
  docker exec -i cmr-pg psql -U cmr -d cmr_prod <<'SQL'
DELETE FROM "AutomationRun"
  WHERE "contentIds" && (
    SELECT COALESCE(array_agg(id), ARRAY[]::text[])
    FROM "Content" WHERE id LIKE 'ck_demo_%'
  );
DELETE FROM "Content" WHERE id LIKE 'ck_demo_%';
SQL
  ok "Cleanup done"
  exit 0
fi

# --------------------------------------------------------------------------- #
# Mode --list
# --------------------------------------------------------------------------- #
if [ "${1:-}" = "--list" ]; then
  bold "Drafts ck_demo_* en prod"
  docker exec cmr-pg psql -U cmr -d cmr_prod -c \
    "SELECT id, status, cardinality(tags) AS n_tags, left(COALESCE(summary, ''), 80) AS summary_preview
     FROM \"Content\" WHERE id LIKE 'ck_demo_%' ORDER BY \"createdAt\" DESC;"
  exit 0
fi

# --------------------------------------------------------------------------- #
# Mode normal : create + wait for cron + report
# --------------------------------------------------------------------------- #
TITLE="${1:-Demo auto-tag — actualité culturelle Mali}"
BODY="${2:-Le festival international de Bamako se tient du 15 au 22 juin 2026 avec plus de 200 artistes invités. Le programme inclut concerts, expositions photo et projections cinéma. L'entrée est gratuite pour les moins de 18 ans. Le ministère de la Culture annonce une augmentation budgétaire de 30% pour ce type d'événement.}"
DRAFT_ID="ck_demo_$(date +%s)"

bold "Création du draft $DRAFT_ID"
TITLE_ESC=$(printf %s "$TITLE" | sed "s/'/''/g")
BODY_ESC=$(printf %s "$BODY"  | sed "s/'/''/g")
docker exec -i cmr-pg psql -U cmr -d cmr_prod <<SQL
INSERT INTO "Content" (id, title, body, type, status, "authorId", tags, "createdAt", "updatedAt")
VALUES ('$DRAFT_ID', '$TITLE_ESC', '$BODY_ESC', 'article', 'draft', '$AUTHOR_ID', '{}', NOW(), NOW());
SQL
ok "draft '$DRAFT_ID' créé (tags vide, status draft)"

bold "Attente du cron n8n (polling toutes les 5s, max 6 min)"
info "Pour aller plus vite : ouvre $WORKFLOW_URL et clique 'Execute workflow'."
START=$(date +%s)
for i in {1..72}; do
  sleep 5
  N=$(sql_quiet "SELECT cardinality(tags) FROM \"Content\" WHERE id='$DRAFT_ID';" || echo 0)
  if [ "${N:-0}" -gt 0 ]; then
    ELAPSED=$(( $(date +%s) - START ))
    ok "Tagué après ${ELAPSED}s"
    break
  fi
  printf "."
done
echo

bold "Résultat"
docker exec cmr-pg psql -U cmr -d cmr_prod -c \
  "SELECT id, tags, summary FROM \"Content\" WHERE id='$DRAFT_ID';"

bold "AutomationRun pour ce draft"
docker exec cmr-pg psql -U cmr -d cmr_prod -c \
  "SELECT \"executionId\", status, metadata->'tags' AS tags_logged, \"startedAt\"
   FROM \"AutomationRun\"
   WHERE \"contentIds\" @> ARRAY['$DRAFT_ID']::text[]
   ORDER BY \"startedAt\" DESC LIMIT 3;"

echo
ok "Test terminé. Pour supprimer ce draft : $0 --cleanup"
