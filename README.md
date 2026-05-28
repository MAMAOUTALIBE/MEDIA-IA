# MEDIA-IA · CMR — Content Media Room

> Plateforme intelligente de gestion et de diffusion de contenus média pour un diffuseur TV national.

[![CI](https://github.com/MAMAOUTALIBE/MEDIA-IA/actions/workflows/ci.yml/badge.svg)](https://github.com/MAMAOUTALIBE/MEDIA-IA/actions/workflows/ci.yml)

CMR centralise la chaîne éditoriale complète :
- saisie multi-format (article, vidéo, audio, social),
- workflow de validation à 4 niveaux (Journaliste → Rédacteur → Chef d'édition → Direction),
- vérifications IA (7 contrôles + score global),
- diffusion omnicanale (9 plateformes connectées),
- DAM, analytics, audit immuable, app mobile journaliste.

L'objectif **MEDIA-IA** est de proposer une alternative ouverte, IA-native et souveraine aux suites propriétaires (Arc XP, ENPS, Avid MediaCentral).

---

## 🚦 État actuel

| Couche | Statut | Notes |
|---|---|---|
| **Frontend** (Next.js 16 + React 19 + Tailwind v4) | ✅ Production-ready | 17 routes, 14 modules, dark glassmorphism, aurora animée, error/not-found/global-error |
| **Backend** (NestJS 11) | ✅ Production-ready | 17 modules, RFC 7807 Problem Details, request-id correlation, graceful shutdown, timeout/idempotency/circuit-breaker interceptors |
| **Auth** | ✅ | JWT HS512 + Argon2id + 2FA TOTP + refresh-token rotation + cooldown anti-cascade + `service_automation` role pour n8n |
| **Persistance** | ✅ | Prisma 6 + Postgres 16, 3 migrations (init / Sprint 1 MFA / Sprint 9 n8n+GDPR), audit chain SHA-256 vérifiable |
| **Temps réel** | ✅ | Socket.IO + Redis adapter (scale-out), fallback in-process |
| **IA** | ✅ | Claude Sonnet 4.6 streaming SSE + circuit breaker, prompt-caching, fallback heuristique |
| **Médias** | ✅ | S3/MinIO presigned URLs, `media-upload` throttle bucket dédié |
| **Tests** | 🟢 | 76 unit (+ 14 opt-in E2E) ; audit modules 16/16 ; audit API 37/37 ; smoke 18/18 |
| **Sécurité runtime** | ✅ | Helmet strict + CSP prod + COOP + HSTS preload + CORS allow-list exact + 4 throttle buckets (auth, ai, media, default) |
| **GDPR** | ✅ | Right-to-be-forgotten (4-eyes principle) + `UserDeletionRequest` + audit critical |
| **n8n integration** | 🟡 Foundations | Rôle + service-token + AutomationRun model + audit hooks prêts ; déploiement n8n à faire ([ADR-011](./docs/adr/011-n8n-integration.md)) |
| **Observabilité** | ✅ | Sentry (api + web) + OpenTelemetry + Prometheus + Pino + X-Request-Id end-to-end |
| **CI/CD** | ✅ | GH Actions complet (lint/test/build + Trivy + CodeQL + Lighthouse) |
| **Feature flags** | ✅ | In-process, env-overridable, 8 flags couvrant publishing/AI/GDPR/n8n |

Roadmap stratégique 12 mois : voir [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## 🏗️ Architecture (monorepo Turborepo)

```
/
├── apps/
│   ├── web/          # Next.js 16 — front éditorial + dashboard
│   └── api/          # NestJS 11 — API REST + health (à enrichir)
├── packages/
│   ├── types/        # types TypeScript partagés
│   ├── db/           # schéma Prisma déclaratif
│   └── config/       # configs ESLint / Prettier / TS partagées
├── docs/             # ADRs, ROADMAP, runbooks
└── .github/          # workflows CI, templates PR, CODEOWNERS
```

Stack courante :
- **Front** : Next.js 16 (App Router) · React 19 · TailwindCSS v4 · Shadcn (base-ui) · Framer Motion · TanStack Query · Zustand · Recharts · cmdk · Sonner
- **Back** (en cours) : NestJS 11 · Prisma 6 · Postgres 16 · Redis 7 · Kafka / Redpanda (prévu)
- **Orchestration** : Camunda 8 BPMN (prévu) · n8n (prévu)
- **IA** : Claude Sonnet 4.6 + Whisper Large v3 + pgvector RAG (prévu)
- **DevOps** : Docker Compose dev · Turborepo · pnpm workspaces · GitHub Actions

---

## 🚀 Quickstart (poste développeur)

Prérequis : **Node 20+** et **pnpm 9+**. Sur macOS sans admin, installer via `fnm` :

```bash
curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell --force-install
"$HOME/Library/Application Support/fnm/fnm" install --lts
eval "$($HOME/Library/Application\ Support/fnm/fnm env --shell bash)"
npm install -g pnpm@latest
```

Cloner + installer :

```bash
git clone https://github.com/MAMAOUTALIBE/MEDIA-IA.git cmr
cd cmr
pnpm install
```

Lancer en dev :

```bash
pnpm --filter web dev          # http://localhost:3000  — front Next.js
pnpm --filter api dev          # http://localhost:4000  — API NestJS
```

Vérifier le projet entier :

```bash
pnpm typecheck                 # TypeScript sur tous les workspaces
pnpm lint                      # ESLint
pnpm build                     # Build prod tous workspaces
```

---

## 📁 Structure clé du front (`apps/web/`)

- `src/app/` — Next.js App Router (route group `(marketing)` pour la landing + `/dashboard/*` pour l'app + `/mobile/*` pour l'app journaliste)
- `src/components/dashboard/` — composants spécifiques par module (shell, home, contenus, médias, live, audit, …)
- `src/components/landing/` — sections landing
- `src/components/ui/` — primitives (GlassCard, KpiCard, ChannelIcon, EmptyState, Logo, Sparkle, …) + composants shadcn générés
- `src/lib/mocks/` — datasets typés (à remplacer par appels API)
- `src/lib/queries/` — hooks TanStack Query (single point of swap mocks → API)
- `src/lib/stores/` — stores Zustand (UI, drafts, mobile, pending)
- `src/lib/ai-engine.ts` — moteur d'intents heuristique pour l'AI Assistant (à remplacer par LLM)

---

## 🤝 Contribuer

Voir [`CONTRIBUTING.md`](./CONTRIBUTING.md) pour le workflow Git, les conventions de commit, et le process de revue.

Décisions architecturales : voir [`docs/adr/`](./docs/adr/).

---

## 📝 Licence

Propriétaire — © GMD 2025. Tous droits réservés.

Contact : `contact@gmd2025.org`
