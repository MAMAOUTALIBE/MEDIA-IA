# @cmr/api · NestJS 11

API REST + WebSocket pour la plateforme CMR. Sert actuellement des mocks in-memory en attendant la migration Prisma sur Postgres (Phase 1 du roadmap).

## Quickstart

```bash
# Depuis la racine du monorepo
pnpm install

# Dev (port 4000, hot reload via nest start --watch)
pnpm --filter @cmr/api dev

# Build prod
pnpm --filter @cmr/api build && node apps/api/dist/main.js
```

Variables d'env supportées :
- `PORT` (défaut `4000`)
- `HOST` (défaut `0.0.0.0`)
- `CORS_ORIGIN` (défaut `http://localhost:3000`)
- `LOG_LEVEL` (`info`/`debug`/`warn`/`error`, défaut `info`)
- `NODE_ENV` (`development`/`production`)

## Endpoints REST (Phase H — in-memory mocks)

Tous les endpoints sont préfixés par `/api`. CORS ouvert à `localhost:3000` par défaut.

### Health

| Méthode | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness — `{ok, service, version, uptime_ms, timestamp, env}` |
| GET | `/api/health/ready` | Readiness — état dépendances DB/Redis/Kafka (pending) |

### Contents

| Méthode | Path | Query | Description |
|---|---|---|---|
| GET | `/api/contents` | `status?`, `type?`, `q?` | Liste filtrable (count + items) |
| GET | `/api/contents/:id` | — | Détail d'un contenu, 404 si introuvable |

Exemples :
```bash
curl localhost:4000/api/contents?status=published
curl 'localhost:4000/api/contents?type=video&q=festival'
curl localhost:4000/api/contents/c1
```

### KPIs & Plateformes

| Méthode | Path | Description |
|---|---|---|
| GET | `/api/kpis` | 4 KPI dashboard home (contenus, audience, vues vidéo, engagement) |
| GET | `/api/kpis/platforms` | Parts d'audience par canal (9 plateformes) |

### Audit & Conformité

| Méthode | Path | Query | Description |
|---|---|---|---|
| GET | `/api/audit` | `severity?` (`info`\|`warning`\|`critical`\|`all`), `q?` | Liste paginée + totaux par sévérité + count d'échecs |

### Workflows

| Méthode | Path | Description |
|---|---|---|
| GET | `/api/workflows` | Instances en cours + compteurs par étape (1-5) |

### Notifications (3 catégories)

| Méthode | Path | Description |
|---|---|---|
| GET | `/api/notifications` | Bundle complet (mentions + system + validations) |
| GET | `/api/notifications/mentions` | Mentions seules |
| GET | `/api/notifications/system` | Alertes système seules |

## WebSocket (Phase I)

Socket.io namespace `/notifications` sur le même port (4000).

### Côté client (apps/web)

```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:4000/notifications");
socket.on("welcome", (data) => console.log("connected", data));
socket.on("heartbeat", (data) => console.log("pulse", data.tick));
socket.on("activity", (event) => console.log("new activity", event));
```

### Événements émis

| Événement | Fréquence | Payload |
|---|---|---|
| `welcome` | À la connexion | `{ id, message }` |
| `heartbeat` | Toutes les 5s | `{ ts, tick }` |
| `activity` | Toutes les 8-12s (aléatoire) | `{ type, actor, message, at }` |

L'événement `activity` simule un flux temps réel d'activité éditoriale. À la Phase 1, il sera émis par les workers Kafka consommant les vrais événements métier (`content.published`, `validation.approved`, etc.).

## Architecture

```
src/
├── main.ts                    # bootstrap (port 4000, CORS, global /api prefix)
├── app.module.ts              # root module
├── mocks/data.ts              # in-memory datasets (à supprimer Phase 1)
├── health/
│   ├── health.module.ts
│   └── health.controller.ts   # /health + /health/ready
├── contents/
│   ├── contents.module.ts
│   └── contents.controller.ts
├── kpis/                      # /kpis + /kpis/platforms
├── audit/                     # /audit avec filtres
├── workflows/                 # /workflows + step counts
└── notifications/
    ├── notifications.controller.ts   # REST
    └── notifications.gateway.ts      # WebSocket Socket.io
```

## Logging

Pino logger structuré (via `nestjs-pino`) :
- Dev : `pino-pretty` single-line, colorisé
- Prod : JSON brut (consommable par Loki/Datadog/etc.)
- Redaction automatique : `authorization`, `cookie`, `password`, `token`

## Tests

À ajouter Phase 1 :
- Unit (Vitest) sur les services
- E2E (Supertest) sur les controllers
- Contract (Pact) entre web et api

## Évolution (Phase 1+)

- **Phase 1** : remplacer `src/mocks/data.ts` par injection Prisma + `@cmr/db` client
- **Phase 1** : ajouter authMiddleware (NextAuth shared session via JWT)
- **Phase 1** : ajouter Camunda 8 gateway (`POST /api/workflows/instances` créé une instance Zeebe)
- **Phase 2** : `apps/workers/ai` consomme events Kafka, publie `ai.check.completed`
- **Phase 3** : `apps/workers/media` consomme events `media.uploaded`, lance FFmpeg pool

## Smoke test rapide

```bash
PORT=4000 node dist/main.js &
sleep 2
curl localhost:4000/api/health
curl localhost:4000/api/contents
curl 'localhost:4000/api/audit?severity=critical'
curl localhost:4000/api/notifications
```

Toutes doivent répondre HTTP 200 avec JSON valide.
