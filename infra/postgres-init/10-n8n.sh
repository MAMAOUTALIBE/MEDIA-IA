#!/usr/bin/env bash
# =============================================================================
# CMR · Sprint A — n8n Postgres bootstrap (docker-compose path)
# =============================================================================
# Mounted into postgres:16 via /docker-entrypoint-initdb.d/. The official entry-
# point runs `.sh` files in-shell with $POSTGRES_USER / $POSTGRES_DB pre-set,
# which is what we need to read env-injected secrets and `psql -c …`.
#
# IMPORTANT: docker-entrypoint-initdb.d runs ONLY when the data volume is empty.
# If you mount this against an existing `cmr-pg-data`, this script is skipped.
# Bootstrap then manually:
#
#   docker compose exec postgres bash /docker-entrypoint-initdb.d/10-n8n.sh
#
# Required env (passed through docker-compose.yml from .env):
#   N8N_DB_NAME       (default n8n_data)
#   N8N_DB_USER       (default n8n_user)
#   N8N_DB_PASSWORD   (REQUIRED — fails fast if empty or < 16 chars)
#
# Mirrors infra/k8s/n8n/10-postgres-init-job.yaml so dev/prod stay in lockstep.
# =============================================================================
set -euo pipefail

N8N_DB="${N8N_DB_NAME:-n8n_data}"
N8N_USER="${N8N_DB_USER:-n8n_user}"
N8N_PWD="${N8N_DB_PASSWORD:-}"

if [[ ${#N8N_PWD} -lt 16 ]]; then
  echo "✗ N8N_DB_PASSWORD must be set (>=16 chars). Aborting n8n bootstrap." >&2
  exit 1
fi

echo "→ n8n bootstrap: db=${N8N_DB} user=${N8N_USER}"

# We're already authenticated as $POSTGRES_USER (superuser) via the local
# socket — no password needed.
psql --variable=ON_ERROR_STOP=1 \
     --username="${POSTGRES_USER}" \
     --dbname=postgres <<SQL
SELECT 'CREATE DATABASE ${N8N_DB}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${N8N_DB}')\gexec

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${N8N_USER}') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${N8N_USER}', '${N8N_PWD}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH PASSWORD %L',  '${N8N_USER}', '${N8N_PWD}');
  END IF;
END
\$\$;
SQL

# Schema + grants must be issued INSIDE the n8n DB.
psql --variable=ON_ERROR_STOP=1 \
     --username="${POSTGRES_USER}" \
     --dbname="${N8N_DB}" <<SQL
CREATE SCHEMA IF NOT EXISTS n8n_data AUTHORIZATION ${N8N_USER};

ALTER ROLE ${N8N_USER} SET search_path = n8n_data;

REVOKE ALL ON SCHEMA public FROM ${N8N_USER};
GRANT  ALL ON SCHEMA n8n_data TO ${N8N_USER};

ALTER DEFAULT PRIVILEGES IN SCHEMA n8n_data GRANT ALL ON TABLES    TO ${N8N_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA n8n_data GRANT ALL ON SEQUENCES TO ${N8N_USER};
SQL

echo "✓ n8n bootstrap done"
