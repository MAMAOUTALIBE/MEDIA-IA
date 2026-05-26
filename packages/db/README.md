# @cmr/db

Schéma Prisma déclaratif et client généré pour CMR.

## État actuel

**Déclaratif uniquement.** Aucune migration n'a été appliquée parce que :
1. Postgres n'est pas installé sur ce poste (compte Guest macOS sans admin)
2. La Phase 0 du roadmap est en attente de la levée du bloqueur infra

Le fichier [`prisma/schema.prisma`](./prisma/schema.prisma) reflète la modélisation cible complète :

- **22 models** + **11 enums** couvrant : users/sessions, contents/channels/media, workflow (validation actions immuables avec checksums), publications multicanales, AI checks par type, automations n8n-like, notifications catégorisées, audit append-only, calendrier.
- Indexes optimisés (`@@index`) pour les filtres fréquents (status, role, scheduled, severity, …)
- `deletedAt` pour soft-delete sur User, Content, MediaAsset, Comment
- `signatureHash` SHA-256 sur les `ValidationAction` pour assurer l'immutabilité de la chaîne de validation

## Activation (quand Postgres est dispo)

```bash
# 1. Provisioner Postgres 16 (Docker, managé, ou local)
docker run --name cmr-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=cmr -e POSTGRES_DB=cmr_dev \
  -d postgres:16-alpine

# 2. Configurer .env à la racine
echo 'DATABASE_URL="postgresql://postgres:cmr@localhost:5432/cmr_dev"' > .env

# 3. Première migration
pnpm --filter @cmr/db migrate:dev --name init

# 4. Générer le client
pnpm --filter @cmr/db generate

# 5. (optionnel) Prisma Studio
pnpm --filter @cmr/db studio
```

## Conventions

- IDs : CUID (URL-safe, K-sortable)
- DateTime serveur (`@default(now())`, `@updatedAt`)
- Soft delete préféré pour les entités à risque d'audit
- Enums : tous en `snake_case` côté SQL pour rester proche du domaine métier
- Validation immuable : `ValidationAction.signatureHash` calculé via `sha256(content_id|step|decision|actor|timestamp)` à l'insert. Toute mutation casse la signature et est détectable.

## Évolution prévue

- Phase 1 : seed initial avec les mocks actuels (`apps/web/src/lib/mocks/`) → vraies entrées DB
- Phase 2 : ajout `embeddings vector(1536)` sur Content pour RAG via `pgvector`
- Phase 3 : tables Media `transcodingJobs`, `liveStreamSessions` pour le pipeline FFmpeg/MediaConvert
- Phase 6 : partitioning de `AuditEvent` par mois si volumétrie > 10M lignes
