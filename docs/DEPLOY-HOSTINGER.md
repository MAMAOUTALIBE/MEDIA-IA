# Déploiement CMR — Hostinger VPS

Documentation **opérationnelle** : capture la config réelle de production et les pièges spécifiques au Traefik géré par Hostinger.

> 🎯 Pour redéployer ou mettre à jour : **section 7**. Pour bootstrap depuis zéro : sections 1 à 6.

---

## ⚠️ Pièges à connaître (sinon tu perds des heures)

### Côté Hostinger
1. **DNS** : les enregistrements A pour `cmr.gmd2025.org` et `api.cmr.gmd2025.org` doivent pointer vers **`187.127.228.197`** (vraie IP VPS), PAS `147.79.102.14` (IP NAT partagée Hostinger qui sert d'autres clients).
   - Vérifie avec : `dig +short srv1643859.hstgr.cloud @8.8.8.8` → doit retourner la même IP que tes records DNS.
2. **Traefik Hostinger refuse silencieusement nos containers custom-built** (cmr-api, cmr-web). Aucune log, aucune erreur — juste ignoré. Cause inconnue côté Hostinger (probable check de signature/registry interne).
3. **Workaround** : on met un **nginx reverse-proxy** devant cmr-api et cmr-web. Traefik route vers nginx (qu'il accepte), nginx forwarde vers nos apps. Coût : 2 containers nginx:alpine de ~5 MB chacun, 0% CPU au repos.
4. **`docker-compose.override.yml`** ne doit PAS exister sur le VPS (il pollue le compose principal avec un network `cmr-net` qui n'existe pas). Si présent : `rm /opt/cmr/docker-compose.override.yml`.

### Côté code / build (appris à la dure)
5. **`dotenv` DOIT être en `dependencies`** (pas `devDependencies`) dans `apps/api/package.json`. Sinon le build prod échoue avec `MODULE_NOT_FOUND` (l'image runtime n'a que les deps prod).
6. **`infra/api.Dockerfile` doit copier `/app/apps/api/node_modules`** en plus de `/app/node_modules`. Le monorepo pnpm crée des symlinks dans le workspace que la copie racine manque. Sans cette ligne : `Cannot find module 'reflect-metadata'` et autres.
7. **Le runtime image `node:22-alpine` n'a PAS pnpm**. Pour appliquer des migrations Prisma en prod, utilise **psql direct** (voir §6) ou via le builder stage.
8. **`SENTRY_DSN` est optionnel** (rule `requiredInProd` retirée dans `apps/api/src/common/env.validation.ts`). Si tu remets la rule, ajoute la valeur au `.env`.

### Côté déploiement (rsync)
9. **Le rsync exclut DÉJÀ `.env`** dans `infra/scripts/deploy-hostinger.sh`. Ne JAMAIS retirer cet exclude — sinon ton `.env` local (dev) écrase la prod et il faut tout restaurer (POSTGRES_PASSWORD, JWT_SECRET, SEED_PASSWORD…).
10. **`patches/instrument-stub.js` doit exister localement** dans le repo. Le compose le mount en volume vers `/app/apps/api/dist/instrument.js`. Si le fichier n'existe pas, Docker crée un DOSSIER à sa place et le container crash au boot.

---

## Architecture déployée

```
Internet (DNS → 187.127.228.197)
   ↓ HTTPS:443
[Traefik géré Hostinger — cert Let's Encrypt automatique]
   ↓ HTTP:80 sur réseau "traefik"
[cmr-proxy-api (nginx)]      [cmr-proxy-web (nginx)]
   ↓ HTTP:4000                  ↓ HTTP:3000
[cmr-api (NestJS)]            [cmr-web (Next.js)]
   ↓
[cmr-pg / cmr-redis / cmr-minio]  ← réseau "default", invisibles depuis Internet
```

---

## 0. Prérequis (à faire une seule fois)

| Item | Comment vérifier |
|---|---|
| VPS Hostinger Ubuntu 22.04+ accessible | SSH ou Browser Terminal Hostinger |
| Domaine acheté (gmd2025.org via Hostinger) | hPanel → Domains |
| Docker + Compose v2 installés | `docker --version && docker compose version` |
| Traefik déjà géré par Hostinger | `docker ps | grep traefik` → `traefik-zcbs-traefik-1` |
| Accès SSH root via clé | `ssh root@187.127.228.197 'echo ok'` |

### Setup SSH key (pour push code depuis Mac)

```bash
# Sur ton Mac
[ -f ~/.ssh/id_ed25519 ] || ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
# Copie la sortie
```

**Sur le VPS** (via Browser Terminal Hostinger — important : utilise `>>` avec un saut de ligne explicite pour ne PAS fusionner ta clé avec celle de Hostinger déjà présente) :

```bash
echo "" >> ~/.ssh/authorized_keys
echo "ssh-ed25519 AAAA... ta-cle-publique" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
# Vérif : doit afficher 2 lignes distinctes
wc -l ~/.ssh/authorized_keys
```

---

## 1. DNS (hPanel)

hPanel → Domains → `gmd2025.org` → DNS / Nameservers.

| Type | Name | Content | TTL |
|---|---|---|---|
| A | `cmr` | `187.127.228.197` | 300 |
| A | `api.cmr` | `187.127.228.197` | 300 |

Vérifie la propagation (max ~5 min) :
```bash
dig +short cmr.gmd2025.org @8.8.8.8       # → 187.127.228.197
dig +short api.cmr.gmd2025.org @8.8.8.8   # → 187.127.228.197
```

---

## 2. Sync code Mac → VPS

```bash
# Depuis ton Mac (sync uniquement le code, garde data + node_modules côté VPS)
rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .turbo \
  --exclude dist \
  --exclude .git \
  --exclude docker-compose.override.yml \
  /Users/bahmamadou/MEDIA-IA-1/ \
  root@187.127.228.197:/opt/cmr/
```

**ATTENTION** : on exclut `docker-compose.override.yml` exprès — il pollue la prod.

---

## 3. `.env` de production

Sur le VPS :
```bash
cd /opt/cmr

# Génère les secrets (une fois pour toutes — note-les ailleurs)
echo "JWT_SECRET=$(openssl rand -hex 64)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -hex 32)"
echo "SEED_PASSWORD=$(openssl rand -hex 24)"
```

Édite `/opt/cmr/.env` (déjà créé lors du bootstrap initial). Variables critiques :

```env
DOMAIN=cmr.gmd2025.org
LETSENCRYPT_EMAIL=postmaster@srv1643859.hstgr.cloud
POSTGRES_USER=cmr
POSTGRES_PASSWORD=<hex 32>
POSTGRES_DB=cmr_prod
JWT_SECRET=<hex 64>
JWT_EXPIRES_IN_SECONDS=28800
CORS_ORIGIN=https://cmr.gmd2025.org
NEXT_PUBLIC_API_URL=https://api.cmr.gmd2025.org/api
NEXT_PUBLIC_SOCKET_URL=https://api.cmr.gmd2025.org
NODE_ENV=production
LOG_LEVEL=info
SEED_ADMIN_EMAIL=admin@gmd2025.org
SEED_PASSWORD=<hex 24>
MINIO_ROOT_USER=cmr-minio
MINIO_ROOT_PASSWORD=<hex 32>
REDIS_URL=redis://redis:6379
```

```bash
chmod 600 /opt/cmr/.env
```

---

## 4. Configs nginx-proxy (DÉJÀ DANS LE REPO)

Les fichiers `infra/nginx-proxy/api.conf` et `infra/nginx-proxy/web.conf` sont versionnés dans le repo. Si manquants, recrée-les :

**`infra/nginx-proxy/api.conf`** :
```nginx
server {
  listen 80;
  server_name api.cmr.gmd2025.org;
  client_max_body_size 100M;
  location / {
    proxy_pass http://cmr-api:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
  }
}
```

**`infra/nginx-proxy/web.conf`** : pareil avec `cmr-web:3000` et `server_name cmr.gmd2025.org`.

---

## 5. `docker-compose.yml` (DÉJÀ DANS LE REPO)

Le compose de prod inclut **7 services** : postgres, redis, minio, **api**, **web**, **proxy-api**, **proxy-web**. Les services `api`/`web` ont `profiles: ["app"]` pour qu'ils ne démarrent qu'avec `--profile app`.

**SEULEMENT proxy-api et proxy-web ont des labels Traefik.** api/web n'en ont pas — c'est volontaire (le workaround).

Réseaux :
- `default` (créé par compose) : pour la communication interne (api ↔ pg/redis/minio, proxy ↔ api/web)
- `traefik` (external, name: traefik) : pour exposer proxy-api/proxy-web à Traefik

---

## 6. Premier déploiement (bootstrap)

```bash
ssh root@187.127.228.197
cd /opt/cmr

# 1. Build + start tout (profile app inclut api, web, proxy-api, proxy-web)
docker compose --profile app up -d --build

# 2. Attendre que pg soit healthy puis appliquer migrations
sleep 20
docker exec -i cmr-api sh -c 'cd /app && pnpm --filter @cmr/db exec prisma db push --accept-data-loss'

# 3. Seed admin (utilise le script versionné dans /opt/cmr/admin-seed.js)
docker exec -i cmr-api node /app/admin-seed.js

# 4. Vérif finale
sleep 10
curl -s https://api.cmr.gmd2025.org/api/health
# → {"ok":true,"service":"cmr-api","version":"0.1.0",...,"env":"production"}
```

Ouvre **https://cmr.gmd2025.org/dashboard** → login `admin@gmd2025.org` / `$SEED_PASSWORD`.

---

## 7. Mise à jour (cas normal — c'est ce que tu utiliseras 99% du temps)

### Workflow complet en 4 commandes

```bash
# 1. Sync le code depuis Mac
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude .turbo --exclude dist --exclude .git \
  --exclude docker-compose.override.yml \
  /Users/bahmamadou/MEDIA-IA-1/ \
  root@187.127.228.197:/opt/cmr/

# 2. Rebuild + restart (zero-downtime si possible, sinon ~30s de coupure)
ssh root@187.127.228.197 'cd /opt/cmr && docker compose --profile app up -d --build api web proxy-api proxy-web'

# 3. Si migrations Prisma à appliquer (pnpm absent du runtime → SQL direct via psql) :
ssh root@187.127.228.197 'docker exec -i cmr-pg psql -U cmr -d cmr_prod < /opt/cmr/packages/db/prisma/migrations/<TIMESTAMP>_<name>/migration.sql'
# OU : copie/colle le SQL via heredoc directement dans psql.

# 4. Smoke test
ssh root@187.127.228.197 'curl -s https://api.cmr.gmd2025.org/api/health'
```

### Mise à jour code-only (pas de rebuild)

Si tu changes uniquement du contenu statique ou de la config (pas le Dockerfile ni les packages) :
```bash
rsync ... (étape 1 ci-dessus)
ssh root@187.127.228.197 'cd /opt/cmr && docker compose restart api web'
```

### Rollback rapide

Garde toujours le tag du dernier build qui marchait :
```bash
ssh root@187.127.228.197 'docker tag cmr-api:latest cmr-api:v$(date +%Y%m%d)'
```
Pour rollback :
```bash
ssh root@187.127.228.197 'docker tag cmr-api:v20260528 cmr-api:latest && docker compose --profile app up -d api'
```

---

## 8. Monitoring quotidien

```bash
# État
ssh root@187.127.228.197 'docker ps --filter "name=cmr"'

# Logs live
ssh root@187.127.228.197 'docker logs -f cmr-api'
ssh root@187.127.228.197 'docker logs -f cmr-web'
ssh root@187.127.228.197 'docker logs cmr-proxy-api --tail 50'

# Smoke test complet
curl -s https://api.cmr.gmd2025.org/api/health
curl -sI https://cmr.gmd2025.org/

# Stats containers (CPU/mémoire)
ssh root@187.127.228.197 'docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep cmr'
```

---

## 9. Backup quotidien (à installer une fois)

```bash
ssh root@187.127.228.197 '
sudo CMR_DIR=/opt/cmr bash /opt/cmr/infra/backup/install-cron.sh
sudo bash /opt/cmr/infra/backup/backup-postgres.sh   # test immédiat
ls -lh /var/backups/cmr/daily/
'
```

Backups dans `/var/backups/cmr/{daily,weekly,monthly}` — rotation 7/4/3.

---

## 10. Troubleshooting

### "TRAEFIK DEFAULT CERT" / 404
Probablement `cmr-proxy-api` ou `cmr-proxy-web` est down. Vérifie :
```bash
ssh root@187.127.228.197 'docker ps --filter "name=cmr-proxy"'
```
Si manquant : `docker compose --profile app up -d proxy-api proxy-web`.

### Cert d'un autre domaine (genre `flordopomar.pt`)
Tes DNS pointent vers la **mauvaise IP** (147.79.102.14). Repasse à **`187.127.228.197`** dans hPanel.

### "Network is ambiguous" lors du `docker compose up`
Plusieurs networks orphelins. Nettoie :
```bash
ssh root@187.127.228.197 '
docker network ls --filter "name=cmr_" -q | while read net; do
  count=$(docker network inspect "$net" --format "{{len .Containers}}")
  [ "$count" = "0" ] && docker network rm "$net"
done
'
```

### cmr-api/cmr-web "unhealthy"
Le healthcheck du Dockerfile (`wget localhost:4000/api/health`) échoue à cause d'un bind IPv6/IPv4 dans Node. C'est **cosmétique** : l'API répond bien via le proxy. Ignore.

### Pas de cert SSL Let's Encrypt émis
1. Vérifie que `cmr-proxy-api` et `cmr-proxy-web` sont Up et ont les labels Traefik (`docker inspect cmr-proxy-api --format '{{.Config.Labels}}'`)
2. Force le rescan : `ssh root@187.127.228.197 'docker restart traefik-zcbs-traefik-1'`
3. Attends 60s, retest. ACME storage : `docker exec traefik-zcbs-traefik-1 cat /letsencrypt/acme.json | grep '"main"'`

### Login admin échoue après redéploiement
Le `JWT_SECRET` a peut-être changé entre deux deploys → tous les tokens existants sont invalides. Déconnecte-toi puis reconnecte-toi. Si tu as perdu le SEED_PASSWORD : régénère avec `docker exec cmr-api node /app/admin-seed.js` (idempotent, met à jour le password).

---

## 11. Fichiers de référence dans le repo

```
.env.production.template            ← template du .env de prod
docker-compose.yml                  ← compose de prod (api+web profiles=app, +proxies)
docker-compose.override.yml.example ← NE PAS UTILISER (legacy)
infra/api.Dockerfile                ← build de l'image cmr-api (NestJS)
infra/web.Dockerfile                ← build de l'image cmr-web (Next.js)
infra/nginx-proxy/api.conf          ← reverse-proxy nginx → cmr-api:4000
infra/nginx-proxy/web.conf          ← reverse-proxy nginx → cmr-web:3000
infra/backup/backup-postgres.sh     ← backup quotidien Postgres
infra/backup/install-cron.sh        ← installation du cron + logrotate
patches/instrument-stub.js          ← stub Sentry/OTel (monté en volume sur cmr-api)
admin-seed.js                       ← script de création admin (Argon2id)
docs/DEPLOY-HOSTINGER.md            ← CE document
```

---

## 12. Résumé : la commande magique

**Première fois** :
```bash
ssh root@187.127.228.197 'cd /opt/cmr && docker compose --profile app up -d --build'
```

**Mise à jour** :
```bash
rsync -avz --delete --exclude node_modules --exclude .next --exclude .turbo --exclude dist --exclude .git --exclude docker-compose.override.yml /Users/bahmamadou/MEDIA-IA-1/ root@187.127.228.197:/opt/cmr/ && \
ssh root@187.127.228.197 'cd /opt/cmr && docker compose --profile app up -d --build api web proxy-api proxy-web'
```

Une ligne, ~3 minutes, et c'est en prod.

---

## 13. Sprint 9 — Intégration n8n (état au 2026-05-29)

### Acquis
- ✅ Container `n8n-app` connecté au réseau `cmr_default` (parle à `cmr-api:4000` en interne)
- ✅ Endpoint admin `POST /api/auth/service-token` qui mint un JWT `service_automation` (TTL configurable, max 24h)
- ✅ Endpoint n8n `PATCH /api/contents/:id/tags` (Sprint 9) — restreint à `service_automation`, set `tags + summary` sans toucher au workflow Camunda
- ✅ Modèle `AutomationRun` dans Prisma + endpoint `POST /api/automations/runs` pour audit
- ✅ Right-to-be-forgotten endpoints `/api/gdpr/deletion-requests/*` (4-eyes principle)
- ✅ Migration `20260529_content_tags_summary` (colonnes `tags String[]` + `summary String?` sur `Content` + index GIN)

### Sprint A — activation via `docker compose --profile automation` (2026-05-29)

Avant Sprint A, `n8n-app` tournait en `docker run` standalone, hors compose. Maintenant il est un service du repo (`docker-compose.yml` § `n8n` + `proxy-n8n`), profilé `automation` — donc il ne démarre que si on l'active explicitement.

**Migration depuis le `n8n-app` manuel (à faire UNE FOIS sur le VPS)** :

```bash
ssh root@187.127.228.197

# 1. Stop l'ancien container manuel + récupère son volume (rename, pas suppression)
docker stop n8n-app || true
docker rename n8n-app n8n-app-legacy

# 2. Dans /opt/cmr/.env, ajouter les variables n8n (voir .env.production.template § n8n)
#    Variables OBLIGATOIRES :
#      N8N_HOST, N8N_WEBHOOK_URL, N8N_IP_ALLOWLIST,
#      N8N_DB_PASSWORD, N8N_ENCRYPTION_KEY (réutilise celle de l'ancien container !),
#      N8N_USER_MGMT_JWT_SECRET, N8N_CMR_API_TOKEN, CMR_API_BASE_URL
#
#    ⚠️ La N8N_ENCRYPTION_KEY doit être IDENTIQUE à celle du n8n-app legacy,
#       sinon tous les credentials enregistrés (YouTube, Anthropic, …) deviennent
#       irrécupérables. Récupère-la via :
#         docker exec n8n-app-legacy env | grep N8N_ENCRYPTION_KEY

# 3. Bootstrap Postgres pour n8n_data (si pas encore fait)
#    Si le volume cmr-pg-data est neuf, le script tourne automatiquement.
#    Sinon, force la création :
docker compose exec postgres bash /docker-entrypoint-initdb.d/10-n8n.sh

# 4. Active le profil automation
cd /opt/cmr
docker compose --profile app --profile automation pull n8n proxy-n8n
docker compose --profile app --profile automation up -d n8n proxy-n8n

# 5. Vérifie
docker compose ps n8n proxy-n8n
docker compose logs --tail=50 n8n
curl -sf https://n8n.cmr.gmd2025.org/healthz   # depuis le VPS, ou un host dans N8N_IP_ALLOWLIST

# 6. Une fois validé, supprime le container legacy
docker rm n8n-app-legacy
```

**DNS** : ajouter un A-record `n8n.cmr.gmd2025.org → 187.127.228.197` dans hPanel Hostinger AVANT le `docker compose up` — Traefik a besoin de résoudre l'hostname pour émettre le cert Let's Encrypt.

**Rotation du token CMR_API_TOKEN** : encore manuelle en Sprint A (cron K8s = Sprint D). Toutes les 12 h, sur le VPS :

```bash
ADMIN_JWT=$(curl -fsS -X POST https://api.cmr.gmd2025.org/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SEED_ADMIN_EMAIL\",\"password\":\"$SEED_PASSWORD\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

NEW=$(curl -fsS -X POST https://api.cmr.gmd2025.org/api/auth/service-token \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"label":"n8n-prod","ttlSeconds":43200}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

sed -i.bak "s|^N8N_CMR_API_TOKEN=.*|N8N_CMR_API_TOKEN=$NEW|" /opt/cmr/.env
docker compose --profile automation up -d n8n   # picks up new env, hot restart
unset NEW ADMIN_JWT
```

(Pour mémoire : la **même** stack n8n est livrée en manifests K8s dans `infra/k8s/n8n/` pour la migration cluster gouv à venir — voir [infra/k8s/n8n/README.md](../infra/k8s/n8n/README.md).)

### Mint un service-token pour n8n

```bash
# Sur ton Mac ou le VPS
source /opt/cmr/.env  # ou exporte les vars
ADMIN_TOKEN=$(curl -s -X POST https://api.cmr.gmd2025.org/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SEED_ADMIN_EMAIL\",\"password\":\"$SEED_PASSWORD\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Mint token n8n (12h)
curl -X POST https://api.cmr.gmd2025.org/api/auth/service-token \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"n8n-production","ttlSeconds":43200}'
# → {"token":"eyJ...","sub":"service:n8n-production","expiresIn":43200}
```

### Configurer la credential dans n8n
1. n8n UI : Credentials → Add → **Header Auth**
2. Name : `Authorization` | Value : `Bearer eyJ...` (le token complet)
3. Save sous le nom `CMR API`

### Endpoints réservés à `service_automation`

| Méthode | Route | Usage |
|---|---|---|
| PATCH | `/api/contents/:id/tags` | Pose tags + summary (idempotent, ne touche pas status) |
| POST | `/api/automations/runs` | Log d'exécution (OBLIGATOIRE pour audit) |
| POST | `/api/gdpr/deletion-requests/:id/execute` | Exécution effacement RGPD |

Les autres rôles humains ont `403 Forbidden` sur ces routes (sécurité ANSSI).

### Smoke test depuis n8n container (réseau interne)
```bash
# Depuis le container n8n-app, vérifie qu'il parle bien à cmr-api :
ssh root@187.127.228.197 'docker exec n8n-app curl -s http://cmr-api:4000/api/health'
# → {"ok":true,"service":"cmr-api","version":"0.1.0","env":"production"}
```

---

## Annexe : pourquoi le workaround nginx-proxy ?

Le Traefik géré par Hostinger refuse silencieusement les containers Docker dont l'image est custom-built localement (pas tirée d'un registry public). On l'a confirmé empiriquement :

- `docker run --name canary nginx:alpine + labels Traefik` → fonctionne immédiatement
- `docker compose up cmr-api + labels Traefik identiques` → ignoré par Traefik (aucun log d'erreur, aucun cert, juste 404 default)
- Test isolation : un nginx avec EXACTEMENT les mêmes labels que cmr-api → fonctionne

Cause exacte côté Hostinger inconnue (logs Traefik en INFO ne montrent pas les décisions de filtrage). La solution nginx-proxy contourne le problème en présentant à Traefik un container nginx (qu'il accepte) qui forwarde vers nos containers custom.

Si un jour Hostinger résout ce problème, on pourra retirer les 2 proxies et remettre les labels directement sur api/web. En attendant, le coût est négligeable (2 × nginx:alpine ~5 MB chacun).
