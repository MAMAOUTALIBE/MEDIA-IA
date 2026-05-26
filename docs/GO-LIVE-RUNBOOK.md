# Runbook Go-Live CMR — production

## D-30 : pré-production

- [ ] Pentest cabinet agréé démarré (`docs/pentest-checklist.md`)
- [ ] Audit ISO 27001 préliminaire (`docs/iso27001-controls.md`)
- [ ] Charge testing k6 : 50k RPS HTTP + 10k WebSocket simultanés tenu sur 30 min
- [ ] Backup restauration testée : RPO ≤ 1 min, RTO ≤ 5 min vérifiés
- [ ] Chaos engineering : pod kill + DB latence + Claude down → app recovered
- [ ] Lighthouse CI tous green : perf ≥ 0.85, a11y ≥ 0.98 (cible AAA)
- [ ] Couverture tests : ≥ 80% services, ≥ 60% controllers, e2e 100% critical paths
- [ ] SBOM par image généré + signed (Cosign)
- [ ] Disaster Recovery Plan rédigé + équipe formée
- [ ] Astreintes 24/7 organisées (rotation 3 personnes + escalade)
- [ ] DPA contractés : Anthropic (Claude), Sentry, Cloudflare, Scaleway (hébergeur souverain)
- [ ] Politique de classification données validée par DPO
- [ ] Formation 200 utilisateurs CMR (journalists, rédacteurs, chefs, direction) terminée

## D-7 : freeze

- [ ] Tag `v1.0.0-rc1` créé + image Docker signée + déployé en staging
- [ ] Smoke tests staging : login MFA + créer brouillon + workflow 4 étapes + publish 9 channels + audit chain valid
- [ ] DNS pointing préparé (TTL réduit à 60s 24h avant)
- [ ] Pre-prod readonly snapshot 48h avant production
- [ ] Communication interne envoyée : journée go-live + horaire downtime éventuel
- [ ] CISO + DPO + Direction signent la décision de go-live

## J-1 : préparation finale

- [ ] Cluster prod K8s healthy : 3+ nodes par zone, 3 zones AZ
- [ ] Postgres réplique en streaming WAL + lag < 100ms
- [ ] Secrets Vault rotation : JWT_SECRET, DATABASE_URL, ANTHROPIC_API_KEY
- [ ] Migration Prisma deploy dry-run validée sur snapshot prod
- [ ] DNS prêt : `cmr.gov.example` + `api.cmr.gov.example` (TTL 60s)
- [ ] Cloudflare WAF rules activées + DDoS protection
- [ ] Sentry alerts armées (PagerDuty primaire + Slack #ops)
- [ ] Grafana dashboards SLO publiés et accessibles ops

## Jour J — séquence go-live

### T-2h : final checks
```bash
# Health prod cluster
kubectl get nodes -o wide
kubectl get pods -n cmr -o wide
kubectl top pods -n cmr

# DB ready
psql -h postgres-prod -c "SELECT version(); SELECT count(*) FROM pg_stat_replication;"

# All migrations applied
cd packages/db && pnpm prisma migrate status

# Audit chain still valid sur snapshot prod
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://api.cmr.gov.example/api/audit/chain/verify
```

### T-0 : bascule
```bash
# 1. Mise en maintenance courte (5 min) via flag
kubectl set env deployment/cmr-web -n cmr MAINTENANCE_MODE=true

# 2. Migration finale Prisma (transactional)
kubectl run prisma-migrate --rm -i --image=ghcr.io/cmr/api:v1.0.0 \
  --restart=Never -- pnpm prisma migrate deploy

# 3. Déploiement images v1.0.0
kubectl set image deployment/cmr-api api=ghcr.io/cmr/api:v1.0.0 -n cmr
kubectl set image deployment/cmr-web web=ghcr.io/cmr/web:v1.0.0 -n cmr
kubectl rollout status deployment/cmr-api -n cmr --timeout=10m
kubectl rollout status deployment/cmr-web -n cmr --timeout=10m

# 4. Smoke test
curl -sfL https://api.cmr.gov.example/api/health | jq .ok       # true
curl -sfL https://cmr.gov.example/ -I | head -1                  # 200
# Login + MFA + workflow + publish — script e2e go-live (5 min)
./infra/scripts/golive-smoke.sh

# 5. Lever maintenance
kubectl set env deployment/cmr-web -n cmr MAINTENANCE_MODE=false

# 6. DNS bascule (si pas déjà sur prod)
# Met à jour A records via API DNS souveraine
```

### T+0 → T+1h : surveillance rapprochée
- Grafana dashboard SLO ouvert plein écran
- Sentry alerts surveillées en temps réel
- 1 ingénieur primaire on-call + 1 backup
- Communication direction toutes les 15 min

### Critères go/no-go T+1h
- [ ] HTTP 5xx < 0.1% (vs SLO)
- [ ] Latence P95 < 500ms
- [ ] Aucune alerte Sentry critique
- [ ] Audit chain reste `valid=true`
- [ ] WebSocket connections stables
- [ ] Aucune saturation CPU/mem/connections DB

Si tous OK → go-live confirmé.
Si NOK → rollback (procédure ci-dessous).

## Procédure rollback

```bash
# Rollback applicatif (immutable rollback)
kubectl rollout undo deployment/cmr-api -n cmr
kubectl rollout undo deployment/cmr-web -n cmr

# Rollback DB si migration v1.0.0 incompatible
# (rare, mais prévu — pgBackRest restore point-in-time T-5min)
pg_restore --clean --create -h postgres-prod \
  /backup/cmr-prod-20XX-XX-XX-T0.dump

# Restauration audit chain depuis WAL
# (jamais perdu — WAL stream + Glacier 30y)
```

## J+1 → J+7 : monitoring renforcé

- Daily ops standup 9h avec Grafana review
- Sentry triage 2× / jour
- Performance review hebdomadaire :
  - LCP < 2.5s confirmé sur top 5 routes
  - P99 latence backend < 1s sur top 10 endpoints
  - Connector publication success rate > 99.5%
- Premier post-mortem si incident (template `docs/postmortems/template.md`)

## J+30 : bilan

- [ ] SLA 99.95% tenu (≤ 21min54s downtime)
- [ ] Aucune fuite de données déclarée
- [ ] User feedback consolidé via portal
- [ ] Décision de certification ISO 27001 stade 2 (audit officiel)
- [ ] Rapport de bilan transmis à la Direction + CISO + DPO

## Contacts critiques (à compléter avec vraies identités)

- CISO : ____@gmd2025.org
- DPO : ____@gmd2025.org
- Astreinte primaire : ____ (cell)
- Astreinte secondaire : ____ (cell)
- Cabinet pentest : ____ (24/7)
- Hébergeur souverain : ____ (24/7)
- Anthropic support : enterprise@anthropic.com

## Annexes
- `docs/pentest-checklist.md`
- `docs/iso27001-controls.md`
- `docs/SLO.md`
- `docs/SKILLS.md`
- `docs/ROADMAP.md`
- `docs/adr/006-securite-baseline.md` à `010-archivage-legal-worm.md`
