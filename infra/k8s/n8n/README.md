# n8n on Kubernetes — Sprint A runbook

Manifests for deploying **n8n** in the `cmr-automation` namespace as the orchestrator for utility automations (publishing fan-out, auto-tagging, audit export). Camunda 8 remains the owner of the editorial 4-level validation workflow.

> Full architectural rationale: [ADR-011](../../../docs/adr/011-n8n-integration.md) and [docs/N8N-INTEGRATION-PLAN.md](../../../docs/N8N-INTEGRATION-PLAN.md).

## What's in this folder

| File | Purpose |
|---|---|
| [00-namespace.yaml](00-namespace.yaml) | `cmr-automation` namespace with `name=cmr-automation` label (anchor for NetworkPolicy cross-ns matching). |
| [10-postgres-init-job.yaml](10-postgres-init-job.yaml) | Idempotent Job creating `n8n_data` schema + `n8n_user` role. Run once, then delete the bootstrap Secret. |
| [20-secrets-template.yaml](20-secrets-template.yaml) | **Reference, NOT to apply.** Documents every Secret n8n expects. Real values come from Vault. |
| [30-pvc.yaml](30-pvc.yaml) | 10 Gi RWO PVC for `/home/node/.n8n` (workflow JSON, exec data, sqlite UI cache). |
| [40-deployment.yaml](40-deployment.yaml) | Single-replica Deployment + ClusterIP Service. Image `n8nio/n8n:1.74.0` pinned. Sovereignty flags (no phone-home) baked in. |
| [50-ingress.yaml](50-ingress.yaml) | nginx Ingress on `n8n.cmr.gmd2025.org` with IP allowlist + HSTS + WS upgrade. |
| [60-networkpolicy.yaml](60-networkpolicy.yaml) | Deny-all default + explicit allow: ingress (nginx + Prometheus), egress (cmr-api + Postgres + egress-gw + DNS). |

## Prerequisites

The cluster admin must have set these labels (the NetworkPolicy depends on them):

```bash
kubectl label ns ingress-nginx  name=ingress-nginx
kubectl label ns observability  name=observability
kubectl label ns egress-gw      name=egress-gw
kubectl label ns cmr            name=cmr
```

And the `postgres` and `cmr-api` pods need their app labels (`app: postgres`, `app: cmr-api`) — both already true per `infra/k8s/api-deployment.yaml`.

`cert-manager` and `ingress-nginx` must be installed. `letsencrypt-prod` ClusterIssuer must exist.

## Installation (3 steps)

### 1. Create the namespace + Secrets

```bash
kubectl apply -f infra/k8s/n8n/00-namespace.yaml

# Vault Agent (or External Secrets Operator) provisions:
#   - n8n-encryption       (encryption-key)
#   - n8n-db-creds         (password)
#   - n8n-pg-bootstrap     (superuser + superuser_password — EPHEMERAL)
#   - n8n-user-mgmt-jwt    (jwt-secret)
# For a local kind/minikube cluster, see 20-secrets-template.yaml + use
# `make-secrets.sh apply` (script not committed — secrets are env-specific).
```

### 2. Bootstrap Postgres + mint the CMR service token

```bash
kubectl apply -f infra/k8s/n8n/10-postgres-init-job.yaml
kubectl -n cmr-automation wait --for=condition=complete --timeout=120s job/n8n-pg-init
kubectl -n cmr-automation logs job/n8n-pg-init
# Expected last line: ✓ bootstrap done

# ⚠️ Delete the superuser Secret as soon as the Job succeeds:
kubectl -n cmr-automation delete secret n8n-pg-bootstrap
```

Mint the JWT n8n will use to call the CMR API (admin only, ≤ 24 h TTL — enforced server-side):

```bash
ADMIN_JWT="<admin login token>"
TOKEN=$(curl -fsS -X POST https://api.cmr.gmd2025.org/api/auth/service-token \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"label":"n8n-prod","ttlSeconds":86400}' \
  | jq -r .token)

kubectl -n cmr-automation create secret generic n8n-cmr-api-token \
  --from-literal=token="$TOKEN"
unset TOKEN
```

### 3. Apply the rest

```bash
kubectl apply -f infra/k8s/n8n/30-pvc.yaml
kubectl apply -f infra/k8s/n8n/40-deployment.yaml
kubectl apply -f infra/k8s/n8n/50-ingress.yaml
kubectl apply -f infra/k8s/n8n/60-networkpolicy.yaml

kubectl -n cmr-automation rollout status deploy/n8n --timeout=300s
```

Then update the cmr-api NetworkPolicy so it accepts ingress from `cmr-automation` (already in the file — re-apply if it was already deployed):

```bash
kubectl apply -f infra/k8s/api-deployment.yaml
```

## Verification

```bash
# 1. Pod is running, no restarts
kubectl -n cmr-automation get pods -l app=n8n

# 2. HTTP health from inside the cluster
kubectl -n cmr-automation run -it --rm curl --image=curlimages/curl --restart=Never -- \
  curl -sf http://n8n/healthz

# 3. NetworkPolicy enforcement: a pod outside the allowlist must NOT reach n8n
kubectl run -it --rm probe --image=curlimages/curl --restart=Never -- \
  curl -sf --max-time 5 http://n8n.cmr-automation.svc.cluster.local
# Expected: connection timeout (NetworkPolicy denies it)

# 4. n8n CAN reach the CMR API
kubectl -n cmr-automation exec deploy/n8n -- \
  curl -sf -H "Authorization: Bearer $CMR_API_TOKEN" \
       https://api.cmr.gmd2025.org/api/health
# Expected: {"ok":true,...}

# 5. n8n CANNOT reach the public Internet outside the egress gateway
kubectl -n cmr-automation exec deploy/n8n -- \
  curl -sf --max-time 5 https://example.com
# Expected: failure (egress-gw doesn't allowlist example.com)
```

## Token rotation (Sprint A interim — manual)

The CMR API caps service tokens at 24 h. Until Sprint D ships the cron rotator:

```bash
# Every < 24 h, on the admin bastion:
ADMIN_JWT="<fresh admin login>"
TOKEN=$(curl -fsS -X POST https://api.cmr.gmd2025.org/api/auth/service-token \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"label":"n8n-prod","ttlSeconds":86400}' \
  | jq -r .token)

kubectl -n cmr-automation create secret generic n8n-cmr-api-token \
  --from-literal=token="$TOKEN" --dry-run=client -o yaml \
  | kubectl apply -f -

kubectl -n cmr-automation rollout restart deploy/n8n
unset TOKEN
```

Every issuance is audit-logged (event `service_token_issued`). Rotation events appear in `GET /api/audit?action=service_token_issued`.

## Disaster recovery

| Lost | Recoverable? | How |
|---|---|---|
| `n8n-encryption.encryption-key` | ❌ No | All stored credentials (YouTube/Meta OAuth tokens) become unreadable. Re-create them through the n8n UI. **Back this Secret up to Vault sealed-store.** |
| PVC `n8n-data` | ⚠️ Partial | Workflows are in Postgres (`n8n_data.workflow_entity`). Lost: UI session cache, intermediate exec binaries. |
| Postgres schema `n8n_data` | ❌ Workflows lost | Restore from Postgres backup. WORM audit chain on CMR side is unaffected. |
| `n8n-cmr-api-token` | ✅ Yes | Mint a new one (procedure above). |

## What Sprint A does NOT include

- **Queue mode (Redis + workers)** — Sprint D. Single-replica `Recreate` works for ≤ 50 workflows / day.
- **Egress gateway itself** — separate infra deliverable. Without it, the NetworkPolicy egress to `egress-gw` namespace just blocks everything outbound, which is safe but means workflows can't reach external APIs yet.
- **GitOps for workflows** — Sprint D. Workflows created in the UI live in Postgres only; export them with `n8n export:workflow --separate` to start a `cmr-automations` repo.
- **CMR token cron rotation** — Sprint D.
- **Custom CRDs** (`Workflow` with `data-classification: pii` labels) — Sprint C, when the first PII-touching workflow lands.

## Troubleshooting

**n8n pod crash-loops with `password authentication failed for user "n8n_user"`**
→ The `n8n-db-creds.password` Secret was rotated but the `n8n_user` Postgres password wasn't. Re-run `kubectl apply -f 10-postgres-init-job.yaml` — it's idempotent and `ALTER ROLE … PASSWORD` will sync.

**`/healthz` returns 200 but the UI shows "Cannot reach n8n"**
→ Almost always the WebSocket upgrade not passing through the ingress. Check `50-ingress.yaml` still has the `configuration-snippet` with `Upgrade`/`Connection: upgrade` headers.

**API calls from n8n fail with 401 even after a fresh token**
→ Check the secret didn't keep a trailing newline (`kubectl create secret --from-file` adds one when reading from a file; the `--from-literal` form avoids it).

**`kubectl apply` works but NetworkPolicy doesn't enforce**
→ The cluster's CNI must support NetworkPolicy. Cilium, Calico, Antrea: yes. Flannel by default: no — install Calico policy-only as a side-car.
