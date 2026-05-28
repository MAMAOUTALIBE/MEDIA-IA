# ADR-011 — Intégration n8n pour automatisations utilitaires

- **Statut** : Décidé · Sprint 9
- **Date** : 2026-05-28
- **Liés** : ADR-006 (sécurité baseline), ADR-010 (WORM archival), [docs/N8N-INTEGRATION-PLAN.md](../N8N-INTEGRATION-PLAN.md)

## Contexte

Le besoin métier identifié sur les sprints précédents inclut :

- **Publication multi-plateforme** (9 canaux : Web, YouTube, Meta, X, TikTok, Telegram, SmartTV, Mobile, Instagram) avec retry/backoff
- **Newsletter quotidienne**, **veille concurrentielle**, **modération comments automatique**
- **Auto-tagging IA** à la création d'un contenu
- **Export régulier** de l'audit chain vers archivage légal (S3 WORM, ADR-010)
- **Alerting** sur incidents (Camunda crash, workflow stalled)

Ces tâches sont **récurrentes**, **glue** entre des services tiers, et **non-critiques** par rapport au chemin éditorial. Les coder une par une à la main dans l'API NestJS multiplierait la dette technique et alourdirait le scope sécurité.

## Décision

Adopter **n8n** (auto-hébergé, fair-code) comme orchestrateur d'automatisations utilitaires, en complément de Camunda (qui reste seul propriétaire de la validation éditoriale 4 niveaux + signature légale).

**Camunda et n8n ne se recouvrent pas** :

| Camunda 8 | n8n |
|---|---|
| BPMN durable, signature légale, audit immuable côté DB applicative | Workflows ad-hoc, "glue" services tiers |
| State machines longues (heures/jours) | Workflows courts (secondes/minutes) |
| Géré par les chefs d'édition (UI Camunda Modeler) | Géré par les ops (UI n8n web) |
| Workflows versionnés en BPMN XML, déployés par Camunda Migrator | Workflows versionnés en JSON + GitOps |

## Architecture (résumé)

> Le détail complet est dans [docs/N8N-INTEGRATION-PLAN.md](../N8N-INTEGRATION-PLAN.md).

```
Internet (TLS)
   │
   ├── ingress-nginx (cert-manager, WAF)
   │     ├── api.cmr.tv  →  API NestJS
   │     └── n8n.cmr.tv  →  n8n (admin VPN only)
   │
   └── egress-gateway (WAF + DNS allowlist)
         ↑
n8n (namespace cmr-automation, isolated)
   │
   ├── DB Postgres : schema `n8n_data` (≠ schema applicatif)
   ├── secrets Vault (encryption key, OAuth tokens)
   ├── pas d'accès direct à la DB CMR
   └── communique avec l'API via service_token (rôle `service_automation`)
```

## Sécurité — ce qui change

1. **Nouveau rôle Prisma** `service_automation`, **rang 0** dans la hiérarchie → n'autorise jamais d'endpoint via `@Roles(...)` (rank-based), uniquement via `@ExactRoles("service_automation")`. C'est le principe du moindre privilège : un service token ne peut PAS escalader vers admin par accident.

2. **Endpoint `POST /auth/service-token`** (admin only) émet un JWT court-vie (12h, max 24h) avec `role: "service_automation"`. Audit-loggé avec `service_token_issued`.

3. **Endpoint `POST /automations/runs`** (service_automation only) où n8n vient logger ses exécutions. Chaque run écrit aussi un événement dans la chaîne SHA-256 (`automation_run`).

4. **NetworkPolicy K8s** : n8n ne peut sortir que vers `api.cmr.tv` + egress-gw + DNS interne. Aucun accès direct à la DB applicative.

5. **Egress gateway** : toute sortie internet (YouTube, Meta, Anthropic, SMTP) passe par une gateway avec **allowlist FQDN stricte**. Tout autre hôte bloqué. Logs DNS → SIEM.

6. **Secrets via Vault Agent sidecar** — `N8N_ENCRYPTION_KEY`, OAuth refresh tokens, jamais en plain text dans la DB n8n.

7. **Anti-télémétrie** : `N8N_DIAGNOSTICS_ENABLED=false`, `N8N_VERSION_NOTIFICATIONS_ENABLED=false`, `N8N_TEMPLATES_ENABLED=false`. Aucun phone-home → souveraineté du déploiement.

8. **Pas de community-nodes** : seulement des nodes développés et signés par l'équipe CMR.

## Conformité

- **ISO 27001** : A.8.5 (auth), A.8.16 (surveillance), A.8.20 (réseau), A.8.24 (crypto), A.8.32 (changements) — cf. matrice docs/iso27001-controls.md.
- **RGPD** : workflows touchant PII taggés `data-classification: pii`. Le DPO peut auditer via `kubectl get workflows -l data-classification=pii`. Tout export → S3 chiffré SSE-KMS, rétention conforme registre.
- **ANSSI** : principe du moindre privilège (rôle scopé), défense en profondeur (egress GW), non-répudiation (audit chain).

## Implémentation Sprint 9 (faite)

Les fondations sont en place :

- ✅ Enum Role étendu (`service_automation`), rank=0 dans `auth/roles.decorator.ts`
- ✅ `POST /auth/service-token` (admin only, audit-loggé)
- ✅ Modèle Prisma `AutomationRun` + `GET /automations/runs` (admin) + `POST /automations/runs` (`service_automation` exact-role)
- ✅ Modèle Prisma `UserDeletionRequest` + `GdprService` pour le right-to-be-forgotten (4-eyes principle entre demandeur et exécuteur)
- ✅ FeatureFlagsService avec `automations.n8n_bridge` désactivé par défaut
- ✅ Migration additive `20260528_sprint9_n8n_gdpr_foundations`

## Reste à faire (sprints A→E du plan d'intégration)

Cf. [N8N-INTEGRATION-PLAN.md §8](../N8N-INTEGRATION-PLAN.md) :

- Déployer n8n en namespace K8s `cmr-automation` (Sprint A — infra)
- Configurer Vault Agent sidecar + secrets externes (Sprint A — infra)
- Implémenter les 4 workflows critiques (Sprint C — code n8n)
- GitOps repo `cmr-automations` + GitHub Actions deploy + detect-secrets (Sprint D)
- Pentest n8n + revue ANSSI (Sprint E)

## Conséquences

**Positives**
- Délivre les use cases métier sans gonfler l'API NestJS de connecteurs tiers
- Isolation forte : n8n compromis ne touche pas le chemin éditorial critique
- Audit chain reste single source of truth (n8n traverse l'API, n'écrit jamais directement la DB applicative)
- Conformité par construction : NetworkPolicy + Vault + audit hook = défense en profondeur

**Négatives / risques mitigés**
- Surface d'attaque ajoutée (panneau admin n8n) → **mitigé** : exposé seulement via VPN admin, OIDC obligatoire
- Complexité opérationnelle (un service de plus à monitorer) → **mitigé** : métriques Prometheus partagées + alertes existantes
- Dépendance à n8n upstream → **mitigé** : fair-code, déployable on-premise, code source ouvert auditable. Pas de SaaS dans la chaîne critique.

## Décision validée par
- Architecte plateforme (équipe CMR)
- À valider par RSSI client avant déploiement production

## Sources
- [Plan d'intégration n8n détaillé](../N8N-INTEGRATION-PLAN.md)
- [ADR-006 Sécurité baseline](006-securite-baseline.md)
- [ADR-010 WORM archival](010-archivage-legal-worm.md)
