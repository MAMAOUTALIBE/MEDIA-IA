# Roadmap — MEDIA-IA / CMR 2.x

Plan stratégique 12 mois pour passer du prototype frontend à une plateforme de production diffuseur national.

## North Star

> *Une rédaction de 200 personnes orchestre 24/7 une production éditoriale multi-canaux. De la captation terrain à la publication TikTok, chaque contenu est tracé, modéré IA, validé workflow, archivé pour conformité — sans copier-coller humain.*

Cibles mesurables :
- SLA **99.95 %** sur la diffusion (downtime ≤ 22 min/mois)
- Latence **< 200 ms** soumission terrain → notification rédacteur
- **80 %** des contenus publiés en moins de **15 min** depuis soumission
- **0 publication** sans cosignature de validation enregistrée
- Audit **RGPD / ISO 27001** passé en ≤ 6 mois

## 7 piliers

1. **Backend solide** — NestJS + Postgres + Prisma + Redis + Kafka, monorepo Turborepo
2. **Workflow & automatisation** — Camunda 8 BPMN + n8n + event bus Kafka
3. **IA native** — Claude/GPT + Whisper + Vision + pgvector RAG + speaker diarization
4. **Médias industriels** — S3 + FFmpeg/Mux + live RTMP→HLS + auto-shorts
5. **Auth / RBAC / conformité** — OAuth2/OIDC + SAML + MFA + Cerbos + audit immuable + RGPD
6. **Temps réel & collaboration** — WebSockets + Yjs CRDT + presence + SSE
7. **DevOps / observabilité** — Docker Compose + K8s + GitHub Actions + OpenTelemetry + Sentry + tests Vitest/Playwright/k6

## État au 2026-05-29 (fin de session intensive)

**Livré et déployé en prod :**
- ✅ Sprint 0-9 historique (backend + frontend + n8n + déploiement Hostinger)
- ✅ Sprint A : lock optimiste anti-race n8n + bucket throttle service_automation 500/min
- ✅ Sprint RBAC : ownership-aware CRUD journaliste (POST/PATCH/submit/DELETE) + route guard client
- ✅ Sprint IA-Générative : 3 endpoints Groq Llama 3.3 70B (titres, fact-check, social posts) + panneau UI éditeur
- ✅ Sprint Search : endpoint /contents/search (mode keyword opérationnel, mode sémantique en attente)
- ✅ Pipeline n8n auto-tagging end-to-end (2s, Llama 3.3 70B, draft tagué + summary)

**À activer (config seulement) :**
- ⏸ `GROQ_API_KEY` dans `/opt/cmr/.env` → débloque les 3 endpoints IA-Générative (actuellement 503)
- ⏸ `OPENAI_API_KEY` dans `/opt/cmr/.env` → débloque l'embedding des nouveaux contents
- ⏸ Image postgres → `pgvector/pgvector:pg16` (modifier docker-compose.yml ligne `image:`) → débloque le mode sémantique de la recherche. Volume `cmr-pg-data` préservé. Procédure : `docker compose pull postgres && docker compose up -d postgres` + ré-appliquer `packages/db/prisma/migrations/20260529_pgvector_search/migration.sql`.

**Restant (~6 sprints, prioritaires)** :
1. **Yjs CRDT édition collab** (~5j) — 2 journalistes co-éditent en live, presence, undo distribué
2. **Mobile Expo journaliste** (~7-10j) — push natif, captation offline, géoloc reportage
3. **Camunda 8 BPMN** (~5j) — designer visuel pour les chefs d'édition, état durable
4. **Connectors OAuth diffusion** (~3-5j chacun) — YouTube/Meta/TikTok/X réels en place du mock
5. **Camera live RTMP→HLS** (~5j) — captation direct via OBS/Streamlabs vers le CMR
6. **Multi-tenant + facturation** (~10j) — quand le client gouv aura validé le SaaS

## 6 phases · 12 mois

| Phase | Mois | Critère sortie |
|---|---|---|
| **0 — Foundation** | 1 | 1 page lit la vraie DB, login fonctionne |
| **1 — Backend & Workflow** | 2-3 | Aucun mock backend, contenu traverse les 4 étapes de validation |
| **2 — IA native** | 4-5 | Score IA recalculé par vraie analyse (pas une formule) |
| **3 — Médias industriels** | 5-7 | Journaliste filme → transcription + 3 shorts en < 90 s |
| **4 — Diffusion omnicanale** | 7-9 | Édito validé publie auto sur 7 plateformes en < 60 s |
| **5 — Mobile natif** | 9-11 | iOS + Android sur TestFlight / internal track |
| **6 — Industrialisation** | 11-12 | Prêt à signer SLA contractuel |

## Quick Wins avant Phase 0

10 actions activables immédiatement, ~1 semaine :
1. Git remote + protection
2. Vercel preview deploys
3. Sentry sur le front
4. PostHog analytics produit
5. Lighthouse CI sur chaque PR
6. next-intl scaffolding
7. WCAG AA sur /dashboard
8. Storybook composants
9. Renovate / Dependabot
10. CONTRIBUTING + ADRs

## Décisions à arbitrer avant Phase 0

1. **Cloud** : AWS / GCP / OVH / Scaleway / on-premise
2. **Workflow engine** : Camunda 8 cloud / Camunda self-hosted / Temporal.io
3. **Mobile** : PWA installable d'abord / React Native dès Phase 0

## Équipe & budget indicatifs

- 8 ingénieurs full-time pour Phase 0-6 en 12 mois
- Budget : 400-600 k€/an (team + infra/SaaS)
- Variante 4 ingés : Phase 0-3 en 12 mois, le reste glisse année 2

## Hors-périmètre

- Refonte UX (base actuelle suffit)
- Migration loin de Next.js / React
- Multi-tenant SaaS (focus diffuseur unique d'abord)
- IA générative pour création éditoriale (l'humain reste central)
- Blockchain / NFT (pas de valeur métier identifiée)

## Inspirations / comparables

- NYT Scoop, WaPo Arc XP, BBC iPlayer, Vox Chorus, Sourcefabric Superdesk
- UX : Notion / Linear / Raycast
- Vidéo : Mux / Cloudflare Stream

---

Détail complet par phase et architecture : voir le plan d'origine (interne).
