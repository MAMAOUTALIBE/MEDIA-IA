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
