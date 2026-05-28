# Déploiement CMR — Hostinger VPS

Documentation **opérationnelle** : capture la config réelle de production et les pièges spécifiques au Traefik géré par Hostinger.

> 🎯 Pour redéployer ou mettre à jour : **section 7**. Pour bootstrap depuis zéro : sections 1 à 6.

---

## ⚠️ Pièges Hostinger à connaître (sinon tu perds 6h)

1. **DNS** : les enregistrements A pour `cmr.gmd2025.org` et `api.cmr.gmd2025.org` doivent pointer vers **`187.127.228.197`** (vraie IP VPS), PAS `147.79.102.14` (IP NAT partagée Hostinger qui sert d'autres clients).
   - Vérifie avec : `dig +short srv1643859.hstgr.cloud @8.8.8.8` → doit retourner la même IP que tes records DNS.
2. **Traefik Hostinger refuse silencieusement nos containers custom-built** (cmr-api, cmr-web). Aucune log, aucune erreur — juste ignoré. Cause inconnue côté Hostinger (probable check de signature/registry interne).
3. **Workaround** : on met un **nginx reverse-proxy** devant cmr-api et cmr-web. Traefik route vers nginx (qu'il accepte), nginx forwarde vers nos apps. Coût : 2 containers nginx:alpine de ~5 MB chacun, 0% CPU au repos.
4. **`docker-compose.override.yml`** ne doit PAS exister sur le VPS (il pollue le compose principal avec un network `cmr-net` qui n'existe pas). Si présent : `rm /opt/cmr/docker-compose.override.yml`.

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

# 3. Si migrations Prisma à appliquer :
ssh root@187.127.228.197 'docker exec cmr-api sh -c "cd /app && pnpm --filter @cmr/db exec prisma migrate deploy"'

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

## Annexe : pourquoi le workaround nginx-proxy ?

Le Traefik géré par Hostinger refuse silencieusement les containers Docker dont l'image est custom-built localement (pas tirée d'un registry public). On l'a confirmé empiriquement :

- `docker run --name canary nginx:alpine + labels Traefik` → fonctionne immédiatement
- `docker compose up cmr-api + labels Traefik identiques` → ignoré par Traefik (aucun log d'erreur, aucun cert, juste 404 default)
- Test isolation : un nginx avec EXACTEMENT les mêmes labels que cmr-api → fonctionne

Cause exacte côté Hostinger inconnue (logs Traefik en INFO ne montrent pas les décisions de filtrage). La solution nginx-proxy contourne le problème en présentant à Traefik un container nginx (qu'il accepte) qui forwarde vers nos containers custom.

Si un jour Hostinger résout ce problème, on pourra retirer les 2 proxies et remettre les labels directement sur api/web. En attendant, le coût est négligeable (2 × nginx:alpine ~5 MB chacun).
