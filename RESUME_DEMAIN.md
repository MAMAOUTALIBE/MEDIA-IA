# 📌 Reprise CMR / MEDIA-IA — pause le 26/05/2026

## 🎯 État à l'arrêt

- **11 commits sur main**, push GitHub différé (PAT manquant)
- Web Next.js : 17 routes opérationnelles
- API NestJS : 33 endpoints + WebSocket gateway + Swagger
- Vitest : 17/17 tests verts
- Working tree clean (rien à commit)

```
c3ea3129 feat: Vitest 17 tests + Swagger + WS reactor + CI test step
2afdac67 feat: AI SSE streaming + workflow advance + Prisma seed
935f452d feat: 9 controllers + mutation pattern + WS broadcast
161969c5 feat: web → API wiring + Socket.io consumer
ec62d12f feat: 11 endpoints + Socket.io gateway
69a39911 feat: NestJS scaffold + Prisma schema + @cmr/types
b70adf9c feat: monorepo Turborepo migration
4b38169a feat: a11y skip link + focus + ARIA
f18253d2 chore: gouvernance complète
26852537 chore: import CMR v1 codebase
eeb9c7ec first commit
```

## ⚠️ Important — compte Guest macOS

Si vous vous **déconnectez** du compte Guest, `/Users/Guest/Desktop/cmr/` **peut être effacé** (comportement standard du compte Guest macOS). Une copie identique a été synchronisée sur **`/Volumes/Sans titre 2/cmr/`** (disque externe APFS, 820 Go libres, persistant).

### Si Desktop/cmr a disparu demain matin

```bash
# Récupérer depuis le disque externe (gardez ce disque branché !)
cp -R "/Volumes/Sans titre 2/cmr" /Users/Guest/Desktop/
# Réinstaller Node si nécessaire (voir étape ci-dessous)
```

## 🚀 Démarrer demain — 3 commandes

```bash
# 1. Charger l'env Node (fnm + node 24 + pnpm)
source ~/.cmr-env.sh

# 2. Si ~/.cmr-env.sh a disparu (compte reset), réinstaller :
curl -fsSL https://fnm.vercel.app/install -o /tmp/fnm-install.sh
bash /tmp/fnm-install.sh --skip-shell --force-install
export FNM_BIN="$HOME/Library/Application Support/fnm/fnm"
export FNM_DIR="$HOME/.fnm"
mkdir -p "$FNM_DIR"
eval "$("$FNM_BIN" env --shell bash --fnm-dir "$FNM_DIR")"
"$FNM_BIN" install --lts
npm install -g pnpm@latest
# Recréer .cmr-env.sh :
cat > ~/.cmr-env.sh <<'EOF'
#!/bin/bash
export FNM_BIN="$HOME/Library/Application Support/fnm/fnm"
export FNM_DIR="$HOME/.fnm"
if [ -x "$FNM_BIN" ]; then
  eval "$("$FNM_BIN" env --shell bash --fnm-dir "$FNM_DIR")"
  "$FNM_BIN" use lts-latest >/dev/null 2>&1 || true
fi
EOF

# 3. Aller au projet, vérifier les deps, lancer web + api
cd /Users/Guest/Desktop/cmr
pnpm install     # idempotent, ~1 min si déjà installé
```

## ▶️ Lancer le full-stack

```bash
# Terminal 1 — API NestJS (port 4000)
cd /Users/Guest/Desktop/cmr/apps/api
./node_modules/.bin/tsc -p tsconfig.json
node dist/main.js
# → http://localhost:4000/api/docs (Swagger)
# → http://localhost:4000/api/health (sanity check)

# Terminal 2 — Web Next.js (port 3000)
cd /Users/Guest/Desktop/cmr/apps/web
node ../../node_modules/.pnpm/next@16.2.6_*/node_modules/next/dist/bin/next dev
# → http://localhost:3000
```

Pour vérifier que tout marche :
```bash
curl http://localhost:4000/api/health     # {"ok":true,...}
curl http://localhost:3000/dashboard      # HTTP 200
```

## 🧪 Lancer les tests

```bash
cd /Users/Guest/Desktop/cmr/apps/api
./node_modules/.bin/vitest run
# → 17/17 passed (~2s)
```

## 🚢 Pousser sur GitHub (quand vous aurez un PAT)

Repo distant : `https://github.com/MAMAOUTALIBE/MEDIA-IA.git`

```bash
# Depuis le projet, avec un Personal Access Token GitHub (scope: repo)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx node scripts/git-init.mjs --push-only
```

OU sur une machine admin avec git système :
```bash
cd /Users/Guest/Desktop/cmr
git push -u origin main
```

## 🛣️ Prochaines étapes recommandées

### Quick wins (sans admin requis)

1. **Continuer à étoffer les tests Vitest** sur les controllers (ContentsController.validate, WorkflowsController.advance)
2. **Brancher d'autres mutations** (toggle automations via PATCH /automations/:id côté UI, diffusion republish)
3. **Améliorer l'AI Assistant** : persister l'historique de conversation dans localStorage, ajouter une commande `/history`

### Phase 1 production (admin requis)

1. **Provisionner Postgres** :
   ```bash
   docker run -d --name cmr-pg -p 5432:5432 \
     -e POSTGRES_PASSWORD=cmr -e POSTGRES_DB=cmr_dev postgres:16-alpine
   echo 'DATABASE_URL="postgresql://postgres:cmr@localhost:5432/cmr_dev"' > .env
   ```
2. **Migrer Prisma** : `pnpm --filter @cmr/db migrate:dev --name init`
3. **Seeder** : `pnpm --filter @cmr/db tsx prisma/seed.ts`
4. **Swap mocks → Prisma** : remplacer `import { contents } from "../mocks/data"` par injection de `PrismaService` dans chaque controller (mécanique, ~1 jour)
5. **Bcrypt** sur les passwords dans `auth.service.ts` (10 lignes)
6. **Push GitHub** (cf. section au-dessus)

### Phase 1 avancée

- Camunda 8 BPMN pour remplacer la mutation in-memory workflows
- Whisper + Vision réels (Phase 2)
- Connecteurs YouTube/Meta/TikTok réels (Phase 4)

Tout le roadmap complet est dans [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## 📁 Structure du projet (rappel)

```
/Users/Guest/Desktop/cmr/        ← racine monorepo
├── apps/
│   ├── web/                     ← Next.js 16, 17 routes
│   └── api/                     ← NestJS 11, 33 endpoints + WS
├── packages/
│   ├── types/                   ← @cmr/types
│   └── db/                      ← Prisma schema + seed.ts
├── docs/
│   ├── ROADMAP.md
│   ├── adr/                     ← 5 ADRs
│   ├── i18n.md, storybook.md
├── .github/
│   ├── workflows/ci.yml         ← lint + typecheck + test + build
│   ├── ISSUE_TEMPLATE/
│   ├── CODEOWNERS, renovate.json, dependabot.yml
├── scripts/
│   ├── git-init.mjs             ← userland git (isomorphic-git)
│   └── git-commit.mjs
├── README.md, CONTRIBUTING.md, .gitignore
├── pnpm-workspace.yaml, turbo.json, package.json
└── RESUME_DEMAIN.md             ← VOUS ÊTES ICI
```

## ⚙️ Configuration env

`apps/web/.env.local` :
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

Pas de `.env` à la racine pour l'instant (Postgres pas branché).

## 🐛 Bug connu

Aucun bug bloquant. Note : `pnpm --filter <name> <cmd>` peut échouer à cause du verify-deps-before-run de pnpm 11 — bypass : `cd apps/web && node ../../node_modules/.pnpm/next@*/node_modules/next/dist/bin/next dev`. Déjà documenté dans les scripts.

---

Bon repos 🌙. À demain.
