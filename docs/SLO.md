# Service Level Objectives — CMR (Sprint 8)

## Vision : SLA 99.95 % contractuel pour un diffuseur public d'État
- 99.95 % de disponibilité = **≤ 21 min 54 s de downtime / mois**
- RTO (Recovery Time Objective) ≤ 5 min
- RPO (Recovery Point Objective) ≤ 1 min (réplication continue Postgres + WAL streaming)

## SLI / SLO matrix

| Service | Indicateur (SLI) | Cible (SLO) | Erreur budget mois | Alerte fast burn |
|---|---|---|---|---|
| API HTTP | % requêtes < 500 ms | 99 % | 432 minutes | > 10× rate sur 1h |
| API HTTP | % requêtes 5xx | < 0.1 % | 432 / mois | > 5× rate sur 1h |
| WebSocket | % connexions actives sans coupure | 99.5 % | 216 min | drop > 1% en 5min |
| Workflow validate | latence P95 | < 200 ms | n/a | P95 > 500 ms |
| Workflow → publish | délai bout-en-bout | < 60s 80 % du temps | n/a | P80 > 120 s |
| AI Claude | latence P95 | < 2 s | n/a | P95 > 5 s |
| AI Claude | erreur rate | < 1 % | 4.32h | > 5% sur 10min |
| Storage S3 upload | succès | 99.9 % | 43 min | > 0.5% en 5min |
| Audit chain | intégrité | 100 % (jamais cassée) | 0 | toute valid=false |

## Métriques Prometheus exposées (Sprint 8 baseline)

Endpoint : `GET /api/metrics` (publique en interne K8s, NetworkPolicy isole)

```
cmr_api_http_requests_total{method,route,status}
cmr_api_workflow_transitions_total{from_step,to_step,decision}
cmr_api_publications_total{channel,status}
cmr_api_llm_response_ms_bucket{mode,le}  # histogram
cmr_api_process_cpu_seconds_total
cmr_api_nodejs_eventloop_lag_seconds
cmr_api_nodejs_heap_size_used_bytes
cmr_api_nodejs_active_handles_total
```

## OpenTelemetry traces (Sprint 8 baseline)

Activé si `OTEL_EXPORTER_OTLP_ENDPOINT` est set.

Instrumentations auto :
- `@opentelemetry/instrumentation-http` — req/res spans
- `@opentelemetry/instrumentation-express` — middleware spans
- `@opentelemetry/instrumentation-pg` — Prisma → Postgres
- `@opentelemetry/instrumentation-aws-sdk` — S3 calls
- `@opentelemetry/instrumentation-redis` — Redis (Sprint 8b)

Traces destination : OTel Collector → Tempo (Grafana stack) ou Datadog APM.

## Logs structurés (Sprint 0.6 — déjà actif)

Pino → JSON sur stdout. Collecté par Loki (DaemonSet K8s) ou stack hôte.

Redaction automatique :
- `req.headers.authorization`
- `req.headers.cookie`
- `*.password`
- `*.token`

## Alerts (Sprint 8b — config Grafana)

| Alerte | Condition | Sévérité | Destinataire |
|---|---|---|---|
| API down | `up{job="cmr-api"} == 0` 1 min | Critique | PagerDuty primaire |
| Error rate spike | `rate(http_5xx[5m]) > 0.01` | Critique | PagerDuty |
| Slow burn (SLO) | erreur budget consommé > 5%/24h | Warning | Slack #ops |
| Audit chain broken | `audit_chain_valid == 0` | Critique | PagerDuty + CISO |
| MFA brute force | `rate(failed_login_total[5m]) > 10` | Warning | Slack #security |
| DB connections | `pg_connections_count > 80` | Warning | Slack #ops |
| Disk usage S3 | bucket > 80% quota | Warning | Slack #ops |
| Connector failure | `rate(publications_failed_total[10m]) > 0.05` | Warning | Slack #editorial |

## Chaos engineering (Sprint 8b mensuel)

- **Pod kill** : `kubectl delete pod -l app=cmr-api` → tester graceful shutdown
- **DB latence** : injection 200ms via tc/Toxiproxy
- **S3 indisponible** : block egress → uploads doivent fallback queue
- **Claude API down** : test fallback heuristique (Sprint 3)
- **Network partition** : split cluster en 2 zones, vérifier quorum Postgres

## Backup & DR

- Postgres : pgBackRest backup full quotidien + WAL archive S3 → restauration testée mensuel
- MinIO : MC mirror cross-region toutes les 6h
- Audit chain : double WORM (S3 standard + Glacier — 30 ans)

## Runbooks
Voir `docs/runbooks/` (Sprint Final) — chaque alerte critique a un runbook
markdown chiffré dans le bucket privé `cmr-ops-docs`.
