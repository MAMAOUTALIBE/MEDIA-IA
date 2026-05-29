# Intégration n8n — Plateforme CMR

> Plan d'intégration sécurisé conçu pour livraison à un client gouvernemental.
> Toutes les décisions sont motivées par le besoin de souveraineté, traçabilité et résilience.

## 1. Pourquoi n8n ?

n8n est un orchestrateur de workflows open-source (fair-code), auto-hébergeable, qui complète Camunda pour les automatisations légères du quotidien éditorial :

| Camunda 8 | n8n |
|---|---|
| BPMN de validation éditoriale 4 niveaux | Automatisations utilitaires (alertes, syncs, scrapers) |
| State machines durables + signature légale | Triggers / cron / webhooks rapides à composer |
| Géré par les chefs d'édition | Géré par les ops / journalistes seniors |
| Audit cryptographique | Logs n8n + audit applicatif côté API CMR |

**Use cases concrets identifiés** :
1. Publier un contenu validé sur **9 plateformes** en parallèle (Web, YouTube, Meta, X, TikTok, Telegram, SmartTV…) avec **retry et backoff**
2. **Newsletter quotidienne** : récupérer les 5 contenus les plus engageants des 24h → générer HTML → envoyer via SMTP
3. **Auto-tagging IA** : à la création d'un contenu → appel Claude pour suggérer tags + résumé + image alt
4. **Modération comments** : webhook entrant depuis YouTube/Facebook → Claude classifie → si toxique, masque automatiquement
5. **Veille** : RSS feeds des concurrents (RFI, France24, BBC Afrique) → résumé Claude → fiche dans CMR
6. **Alerting** : crash workflow Camunda → Slack + SMS chef d'édition de garde
7. **Backups** : export quotidien de la base d'audit immuable vers S3 chiffré (WORM)
8. **Compliance** : tous les 6 mois, snapshot du registre RGPD → envoi DPO + archivage légal

---

## 2. Architecture cible

```
                                   ┌───────────────────────────┐
                                   │       Internet (TLS)      │
                                   └───────────────┬───────────┘
                                                   │
                                       ┌───────────▼───────────┐
                                       │ Nginx Ingress (K8s)   │
                                       │ + cert-manager + WAF  │
                                       └─┬──────┬─────────┬────┘
                                         │      │         │
                  app.cmr.tv ────────────┘      │         └──── n8n.cmr.tv (admin only)
                  api.cmr.tv ───────────────────┘                  │
                  ┌──────────┴───────┐                             │
                  │  Web (Next.js)   │                             │
                  └──────────┬───────┘                             │
                             │ HTTPS                               │
              ┌──────────────▼──────────────┐                      │
              │      API NestJS             │                      │
              │  - JWT HS512                │◄─── service-to-service token (mTLS optional)
              │  - Audit chain SHA-256      │                      │
              └──┬────────┬───────────┬─────┘                      │
                 │        │           │                            │
        ┌────────▼┐ ┌─────▼──┐ ┌──────▼─────┐    ┌─────────────────▼────────────┐
        │ Postgres│ │ Redis  │ │ MinIO/S3   │    │  n8n  (separate namespace)    │
        │ cmr_app │ │ rate-l │ │ DAM        │    │  - dedicated Postgres schema  │
        └─────────┘ └────────┘ └────────────┘    │    n8n_data (RW)              │
                                                  │  - dedicated Redis db 1       │
                                                  │  - NetworkPolicy strict       │
                                                  │  - egress only via egress-gw  │
                                                  └──────────────────────────────┘
                                                              │
                                              ┌───────────────┼───────────────┐
                                              ▼               ▼               ▼
                                         Egress GW       Egress GW       Egress GW
                                         YouTube API     Anthropic       SMTP relay
                                         Meta Graph      Slack/SMS       (TLS only)
```

### Principes
- **n8n vit dans son propre namespace Kubernetes** `cmr-automation`. Aucun accès direct au stockage applicatif.
- **Persistance n8n séparée** : DB schema `n8n_data` dans la même instance Postgres (économie d'opex) ou DB dédiée selon l'audit ANSSI.
- **NetworkPolicy** : n8n ne peut parler qu'à `api.cmr.tv` (port 443 interne), à `egress-gw` (sortie internet contrôlée), et à `postgres` (sur `n8n_data` uniquement).
- **L'API CMR reste source de vérité** : n8n ne lit/écrit JAMAIS directement la DB applicative. Tout passe par l'API REST avec un compte de service.

---

## 3. Authentification n8n ↔ API CMR

### 3.1 Compte de service dédié
Créer un rôle `service_automation` dans Prisma (en plus de `journalist`/`editor`/`chief`/`direction`/`community_manager`/`admin`).

```prisma
enum Role {
  journalist
  editor
  chief
  direction
  community_manager
  admin
  service_automation   // ← nouveau, non-humain
}
```

Permissions du rôle :
- **Lecture** : `/contents`, `/workflows`, `/audit`, `/kpis`, `/analytics/*`
- **Écriture limitée** : `/notifications/broadcast`, `/automations/runs`, `/diffusion/publish`
- **Interdit** : `/users/*`, `/auth/*` (sauf `/auth/login` pour générer ses propres tokens)

Implémentation dans `roles.guard.ts` :
```ts
const ROLE_RANK = {
  journalist: 1,
  editor: 2,
  chief: 3,
  direction: 4,
  community_manager: 2,
  admin: 5,
  service_automation: 0, // n'a pas de rang hiérarchique, opt-in ExactRoles
};
```

### 3.2 Token long-vécu (rotated)
- Token JWT spécifique signé avec un **secret distinct** `SERVICE_JWT_SECRET` (séparé du JWT_SECRET humain). Compromission isolée.
- Durée 24h max, **rotation automatique toutes les 12h** par un cron K8s.
- Stocké dans `Secret` Kubernetes monté en `--env-file` du conteneur n8n, **jamais en plain text** dans les workflows.
- Une variable d'env n8n `CMR_API_TOKEN` injectée par Vault Agent (HashiCorp Vault sidecar).

### 3.3 Audit obligatoire
Tout appel API d'origine `service_automation` est tagué dans l'audit chain :
```ts
{ actor: "n8n", workflow: "publish-to-youtube-v2", traceId: "...", at: ... }
```

---

## 4. Sécurité réseau

### 4.1 NetworkPolicy K8s
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: n8n-isolated
  namespace: cmr-automation
spec:
  podSelector: { matchLabels: { app: n8n } }
  policyTypes: [Ingress, Egress]
  ingress:
    # Web UI accessible uniquement depuis le VPN admin
    - from:
        - namespaceSelector: { matchLabels: { tier: admin-vpn } }
      ports: [{ port: 5678 }]
    # Webhooks entrants via ingress-controller
    - from:
        - namespaceSelector: { matchLabels: { app: ingress-nginx } }
      ports: [{ port: 5678 }]
  egress:
    # API CMR
    - to:
        - namespaceSelector: { matchLabels: { app: cmr-api } }
      ports: [{ port: 4000 }]
    # DB Postgres (schéma n8n_data uniquement, pas cmr_app)
    - to:
        - podSelector: { matchLabels: { app: postgres } }
      ports: [{ port: 5432 }]
    # Egress gateway (toute sortie internet doit transiter ici)
    - to:
        - namespaceSelector: { matchLabels: { app: egress-gw } }
      ports: [{ port: 443 }]
    # DNS interne
    - to:
        - namespaceSelector: { matchLabels: { kubernetes.io/metadata.name: kube-system } }
      ports: [{ port: 53, protocol: UDP }]
```

### 4.2 Egress gateway
- Tout trafic n8n vers Internet passe par un **gateway egress** (Cloud NAT + Istio egress + WAF).
- Listing strict des hôtes autorisés :
  - `*.googleapis.com` (YouTube Data API)
  - `graph.facebook.com`
  - `api.anthropic.com`
  - `slack.com`
  - SMTP `mail.cmr.tv`
- Tous les autres FQDN bloqués.
- Logs DNS et HTTP gateway → SIEM (Elasticsearch) avec rétention 1 an.

### 4.3 Secrets management
- `n8n.credentials` jamais en clair dans la DB n8n → utiliser `N8N_ENCRYPTION_KEY` lui-même monté depuis Vault.
- **Rotation des credentials externes** (YouTube OAuth refresh tokens) automatique tous les 30j par un workflow n8n dédié.
- Audit trail : chaque rotation génère un événement `audit.credential.rotated` dans CMR.

### 4.4 Hardening container
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities: { drop: ["ALL"] }
  seccompProfile: { type: RuntimeDefault }
```

---

## 5. Conformité & gouvernance

### 5.1 RGPD
- **Workflows touchant PII** doivent être marqués `data-classification: pii` (label K8s).
- Tout export → S3 chiffré (SSE-KMS) avec rétention conforme registre des traitements.
- Le DPO peut auditer : `kubectl get workflows.n8n.io -l data-classification=pii`.

### 5.2 ISO 27001
| Contrôle | Implémentation |
|---|---|
| A.8.5 (Authentification) | JWT HS512 + rotation + Vault |
| A.8.16 (Activités de surveillance) | Toutes les exécutions n8n → audit chain SHA-256 |
| A.8.20 (Sécurité du réseau) | NetworkPolicy + Egress GW + WAF |
| A.8.24 (Cryptographie) | TLS 1.3 mTLS interne + AES-256 secrets |
| A.8.32 (Gestion des changements) | Tout workflow versionné en Git, déployé via ArgoCD |

### 5.3 ANSSI — Recommandations
- Pas d'accès direct n8n → DB applicative (PASSI : "principe du moindre privilège").
- Egress contrôlé par gateway → "défense en profondeur".
- Logs séparés du trafic applicatif → "non-répudiation".

### 5.4 Audit immuable côté CMR
Hook côté API : chaque appel `service_automation` est ajouté à la chaîne d'audit avec :
- `actorId: "n8n:<workflow_id>"`
- `traceId: <correlation-id>` propagé depuis n8n
- `checksumSha256` chaîné comme tout autre événement
- **Vérifiable** via `GET /api/audit/verify` (déjà implémenté)

---

## 6. Versionnage des workflows

### 6.1 GitOps
- Chaque workflow n8n est exporté en JSON via `n8n export:workflow --separate --output=workflows/`.
- Le repo `cmr-automations` contient :
  ```
  workflows/
    publish-to-youtube/
      v1.0.0/workflow.json
      v1.0.0/CHANGELOG.md
      v1.0.0/runbook.md
      v1.1.0/...
  ```
- Déploiement via **n8n REST API** depuis un job GitHub Actions :
  ```bash
  curl -X PUT https://n8n.cmr.tv/api/v1/workflows/$ID \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -d @workflows/publish-to-youtube/v1.1.0/workflow.json
  ```

### 6.2 Review process
- PR sur le repo `cmr-automations` → review obligatoire par **2 personnes** (sécurité + ops).
- CI run :
  - Lint JSON
  - **Detect-secrets** sur le workflow JSON (pas de credentials hardcodés)
  - Test dry-run en environnement de staging

### 6.3 Rollback
- Tous les workflows ont une version `vX.Y.Z` immuable en DB.
- Rollback = redéployer la version N-1 via GitHub Actions.
- RTO cible : 5 minutes.

---

## 7. Observabilité

### 7.1 Métriques exposées
n8n expose `/metrics` Prometheus :
- `n8n_workflow_executions_total{workflow,status}` (success / error / canceled)
- `n8n_workflow_execution_duration_seconds`
- `n8n_node_execution_errors_total{node_type}`

Scrape par Prometheus (déjà déployé pour l'API CMR).

### 7.2 Logs structurés
- n8n logs en JSON via `N8N_LOG_LEVEL=info N8N_LOG_OUTPUT=console N8N_LOG_FILE_FORMAT=json`.
- Collecté par Loki/Fluentbit → Elasticsearch.
- Champs obligatoires : `workflow_id`, `execution_id`, `node_name`, `traceId`, `actor=service_automation`.

### 7.3 Alerting
Règles Prometheus :
```yaml
- alert: N8nWorkflowErrorRateHigh
  expr: rate(n8n_workflow_executions_total{status="error"}[5m])
        / rate(n8n_workflow_executions_total[5m]) > 0.1
  for: 10m
  annotations:
    summary: "n8n: >10% d'erreurs sur 10 min — workflow {{ $labels.workflow }}"

- alert: N8nWorkflowStalled
  expr: n8n_workflow_executions_running > 5
  for: 30m
  annotations:
    summary: "Workflows bloqués depuis 30 min"
```

### 7.4 SLO n8n
- 99.5% des exécutions terminent en < 5 min (P99)
- 99.9% sans erreur applicative (hors retries volontaires)
- Budget d'erreur : 0.1% / mois (suit le SLO de l'API CMR)

---

## 8. Plan d'implémentation (sprint-based)

### Sprint A — Bootstrap (1 sem) — ✅ shipped 2026-05-29
- [x] Déployer n8n en namespace `cmr-automation` avec manifests K8s
      → [infra/k8s/n8n/](../../infra/k8s/n8n/) + docker-compose profile `automation`
- [x] NetworkPolicy + ingress nginx + cert TLS
      → [60-networkpolicy.yaml](../../infra/k8s/n8n/60-networkpolicy.yaml) (deny-default + 4 explicit allows)
      → [50-ingress.yaml](../../infra/k8s/n8n/50-ingress.yaml) (IP allowlist + HSTS + WS upgrade)
- [x] Postgres schema `n8n_data` + user dédié
      → [10-postgres-init-job.yaml](../../infra/k8s/n8n/10-postgres-init-job.yaml) (K8s)
      → [infra/postgres-init/10-n8n.sh](../../infra/postgres-init/10-n8n.sh) (compose)
- [ ] Vault Agent sidecar pour secrets
      → reporté Sprint D ; pour l'instant Secrets gérés à la main via
        [20-secrets-template.yaml](../../infra/k8s/n8n/20-secrets-template.yaml)

### Sprint B — Auth & Audit (1 sem)
- [ ] Ajouter rôle `service_automation` dans Prisma + roles.guard
- [ ] Endpoint `POST /api/auth/service-token` (admin only) pour mint tokens
- [ ] Hook audit pour tagguer les appels d'origine n8n
- [ ] Renforcement `Throttle` : bucket `service_automation` avec quota séparé

### Sprint C — Premiers workflows critiques (2 sem)
- [ ] Workflow `publish-to-youtube` (avec retry + audit)
- [ ] Workflow `daily-newsletter`
- [ ] Workflow `auto-tag-content` (Claude)
- [ ] Workflow `audit-export-s3` (backup légal)

### Sprint D — Production hardening (1 sem)
- [ ] GitOps repo `cmr-automations` + GitHub Actions
- [ ] Detect-secrets en CI
- [ ] Métriques Prometheus + dashboards Grafana
- [ ] Alertes AlertManager
- [ ] Runbook ops + formation équipe

### Sprint E — Pentest & livraison (2 sem)
- [ ] Audit sécurité interne checklist ANSSI
- [ ] Pentest externe ciblé n8n + intégration CMR
- [ ] Documentation conformité ISO 27001 / RGPD
- [ ] Validation client (ingénieurs sécurité)

**Total : 7 semaines, 2 développeurs**.

---

## 9. Points critiques pour la livraison gouvernementale

1. **Souveraineté** : n8n self-hosté, aucune télémétrie sortante (`N8N_DIAGNOSTICS_ENABLED=false`).
2. **Pas de SaaS dans la chaîne critique** : SMTP relay local, S3-compatible MinIO si pas d'accès AWS.
3. **Cryptographie** : seuls les algorithmes ANSSI-RGS approuvés (AES-256-GCM, RSA-3072, HS512).
4. **Logs séparés** : aucun log n8n ne doit contenir de PII complète. Redaction obligatoire (`pino-redact` côté API renvoie déjà des champs nettoyés).
5. **Disaster Recovery** : snapshot DB n8n_data toutes les heures + RTO 1h documentés.
6. **Air-gap option** : tous les workflows critiques doivent pouvoir tourner sans accès internet pendant 72h (queue locale).
7. **Pas de plugins tiers** : n8n custom nodes uniquement développés et signés par l'équipe CMR (suppression de `community-nodes`).

---

## 10. Ce qu'on NE fait PAS avec n8n

| Tâche | Pourquoi pas n8n |
|---|---|
| Validation éditoriale 4 niveaux | Camunda BPMN — durabilité + signature légale |
| Stockage de contenus | API CMR + Prisma — single source of truth |
| Authentification utilisateurs | API CMR — JWT + MFA + audit |
| Calculs IA critiques (modération, vérifications) | API CMR + Claude — encadré par notre prompt + audit |
| Workflow de paiement / financier | Out of scope (jamais sur n8n) |

n8n est un **orchestrateur léger** pour la "glue" éditoriale et l'automatisation utilitaire. **Pas la colonne vertébrale métier**.

---

## Annexe A — Schema Prisma additif

```prisma
model AutomationRun {
  id            String   @id @default(cuid())
  workflowId    String              // n8n workflow id (e.g. "publish-to-youtube-v2")
  executionId   String              // n8n execution id
  triggeredBy   String              // user id or "schedule"
  status        AutomationStatus
  startedAt     DateTime @default(now())
  finishedAt    DateTime?
  errorMessage  String?
  // Link to the entities the workflow acted on (audit trail)
  contentIds    String[]
  metadata      Json?
  @@index([workflowId, status])
  @@index([startedAt(sort: Desc)])
}

enum AutomationStatus {
  running
  success
  failed
  canceled
}
```

## Annexe B — Variables d'environnement n8n minimales

```env
# Sécurité
N8N_ENCRYPTION_KEY=<32 random chars from Vault>
N8N_USER_MANAGEMENT_DISABLED=false
N8N_BASIC_AUTH_ACTIVE=false               # On utilise OIDC, pas basic
N8N_AUTH_METHOD=oidc

# OIDC vers Keycloak / FranceConnect Pro
N8N_OIDC_ISSUER_URL=https://auth.cmr.tv/realms/cmr
N8N_OIDC_CLIENT_ID=n8n-admin
N8N_OIDC_CLIENT_SECRET_FILE=/var/run/secrets/oidc-client-secret

# Persistance
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres.cmr-data.svc
DB_POSTGRESDB_DATABASE=n8n_data
DB_POSTGRESDB_USER=n8n_app
DB_POSTGRESDB_PASSWORD_FILE=/var/run/secrets/db-password

# Pas de phone-home
N8N_DIAGNOSTICS_ENABLED=false
N8N_VERSION_NOTIFICATIONS_ENABLED=false
N8N_TEMPLATES_ENABLED=false
N8N_PERSONALIZATION_ENABLED=false

# Logs structurés
N8N_LOG_LEVEL=info
N8N_LOG_OUTPUT=console
N8N_LOG_FILE_FORMAT=json

# Webhook public (timing-safe HMAC verification)
WEBHOOK_URL=https://n8n.cmr.tv/

# Limites
EXECUTIONS_TIMEOUT=300
EXECUTIONS_TIMEOUT_MAX=900
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=336                # 14 jours puis purge (RGPD)
```

---

**Statut** : Plan de design — à valider par le RSSI client avant implémentation.
**Auteur** : Équipe CMR, mai 2026.
**Version** : 1.0
