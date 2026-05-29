# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MEDIA-IA · CMR (Content Media Room) — editorial production platform for a national TV broadcaster. Targeted at sovereign / government deployment, so security baseline (ADR-006) and audit immutability are non-negotiable.

Stack: **Turborepo + pnpm workspaces** (Node 20+, pnpm 11.3.0).
- [apps/web/](apps/web/) — Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn (`base-nova` preset) → port 3000
- [apps/api/](apps/api/) — NestJS 11, global `/api` prefix → port 4000
- [packages/db/](packages/db/) — Prisma 6 schema + migrations + seed (Postgres 16)
- [packages/types/](packages/types/) — shared TS types (`@cmr/types`)
- [packages/config/](packages/config/) — shared ESLint / Prettier / TS configs

## Common commands

Always run from the repo root unless noted.

```bash
pnpm install                       # install (uses pnpm-workspace.yaml + onlyBuiltDependencies allowlist)
pnpm dev                           # turbo run dev --parallel — web + api together
pnpm --filter @cmr/web dev         # web only (http://localhost:3000)
pnpm --filter @cmr/api dev         # api only (http://localhost:4000/api, Swagger at /api/docs)

pnpm typecheck                     # tsc --noEmit across all workspaces
pnpm lint                          # eslint across all workspaces
pnpm test                          # turbo run test (vitest in apps/api)
pnpm build                         # build all workspaces

# Single API test file (vitest):
cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts
cd apps/api && pnpm vitest run -t "validates TOTP"   # by test name

# Prisma (from repo root via filter, or `cd packages/db`)
pnpm --filter @cmr/db migrate:dev --name <change>    # dev migration
pnpm --filter @cmr/db migrate:deploy                 # apply in CI / prod
pnpm --filter @cmr/db generate                       # regen Prisma client
pnpm --filter @cmr/db studio                         # Prisma Studio

# Local infra (Postgres + Redis + MinIO)
docker compose up -d postgres redis minio
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs lint → typecheck → test → build against a Postgres service, plus Trivy fs+secret scan, CodeQL SAST, and Lighthouse on PRs. `pnpm prisma migrate deploy` runs before tests.

## Architecture — what to read multiple files to understand

### Mocks → API swap point (frontend)

The web app was built mock-first. **All swap logic lives in [apps/web/src/lib/queries/index.ts](apps/web/src/lib/queries/index.ts)** — TanStack Query hooks that call `tryApi()` (GET, falls back to local mock on failure) or `postApi()` (mutations, propagate errors). Mocks under [apps/web/src/lib/mocks/](apps/web/src/lib/mocks/) are typed datasets. When adding a new data-bound feature: write the mock, the hook in `queries/index.ts`, and only then wire the API endpoint. Do **not** sprinkle `fetch` calls in components.

API base URL comes from `NEXT_PUBLIC_API_URL`; when unset, hooks stay on mocks (offline DX).

### Auth & RBAC (security baseline — ADR-006)

- JWT HS512, secret in `JWT_SECRET` (≥64 chars required in prod by [env.validation.ts](apps/api/src/common/env.validation.ts))
- Passwords hashed with **Argon2id** (`@node-rs/argon2`), never bcrypt
- `JwtAuthGuard` is registered globally as `APP_GUARD` — every route is protected by default. Opt out with `@Public()`. Opt into roles with `@Roles(...)` (rank-based hierarchy) or `@ExactRoles(...)` (no rank escalation — used for `service_automation` so n8n service tokens can never reach admin endpoints by accident).
- 2FA TOTP via `otpauth` + Argon2-hashed backup codes ([mfa.service.ts](apps/api/src/auth/mfa.service.ts))
- Refresh-token rotation: opaque token SHA-256 hashed in `Session` table; cooldown (`REFRESH_FAILURE_COOLDOWN_MS` in [api-client.ts](apps/web/src/lib/api-client.ts)) prevents cascade refreshes from the web client
- Roles defined in Prisma `Role` enum: `journalist`, `editor`, `chief`, `direction`, `community_manager`, `admin`, `service_automation`

### Throttling buckets

Four `@nestjs/throttler` buckets declared in [app.module.ts](apps/api/src/app.module.ts): `default` (100/min/IP), `auth` (5/min — brute-force shield on `/auth/login`), `ai` (30/min — LLM cost shield), `media-upload` (20/min — presign shield). Controllers opt into stricter buckets with `@Throttle({ <bucket>: { ... } })`.

### Error envelope — RFC 7807 Problem Details

[problem-details.filter.ts](apps/api/src/common/problem-details.filter.ts) returns `application/problem+json` with a stable shape (`type`, `title`, `status`, `detail`, `instance`, `requestId`, `timestamp`, `errors`). The web client ([api-client.ts](apps/web/src/lib/api-client.ts)) parses it into `ApiError.problem` and `displayMessage`. Don't throw raw strings from controllers — throw `HttpException` subclasses so the filter can shape them.

### Request correlation

`RequestIdMiddleware` ([request-id.middleware.ts](apps/api/src/common/request-id.middleware.ts)) generates / forwards `X-Request-Id`. The same id is reused by:
- Pino logger (`genReqId` in [app.module.ts](apps/api/src/app.module.ts))
- The `X-Request-Id` response header (exposed via CORS)
- The Problem Details envelope (`requestId` field)

Keep this end-to-end chain intact when adding middlewares or filters.

### Feature flags

In-process flags in [feature-flags.service.ts](apps/api/src/common/feature-flags.service.ts). Defaults coded in `DEFAULTS`; override with `FEATURE_<UPPER_SNAKE_NAME>=true|false` env var (e.g. `FEATURE_PUBLISHING_TIKTOK=true`). No external SDK (deliberate — sovereign deployment, no phone-home). Drop-in seam if vendor SDK is ever needed; controllers should call `flags.isEnabled("…")`.

### Real-time (WebSocket)

Socket.IO on `/notifications` namespace, same port as API. Uses `@socket.io/redis-adapter` for horizontal scale-out, with in-process fallback when Redis is absent. Web client → [apps/web/src/lib/socket.ts](apps/web/src/lib/socket.ts).

### Observability

- Sentry: **`import "./instrument"` must be the first non-dotenv import in [main.ts](apps/api/src/main.ts)** — moving it breaks instrumentation
- OpenTelemetry: auto-instrumentation activated when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- Prometheus metrics exposed at `/api/metrics` (see [docs/SLO.md](docs/SLO.md) for SLI/SLO matrix and exposed metric names)
- Pino structured logs with redaction on `authorization`, `cookie`, `password`, `token`

### Audit chain

`AuditEvent.checksumSha256 = SHA-256(JSON record + prevHash)` — tamper-evident chain. Don't bypass the audit service to write events directly. GDPR right-to-be-forgotten uses 4-eyes principle via `UserDeletionRequest`.

### Frontend design tokens (ADR-004)

Tailwind v4 is **CSS-first**: all design tokens live in [apps/web/src/app/globals.css](apps/web/src/app/globals.css) (`:root { --token: … }` + `@theme inline`). **Never** create a `tailwind.config.ts` for tokens; use only the declared CSS variables (`--bg-base`, `--accent-violet`, etc.) — adding raw color literals breaks dark/light parity.

### shadcn `base-nova` preset gotcha (ADR-002)

This project uses shadcn with `@base-ui/react` primitives, **not** Radix. Consequence: **no `asChild` prop on triggers** (legacy Radix pattern that crashes cmdk). When generating new shadcn components, ensure the `base-nova` preset, and verify the trigger pattern matches the existing components under [apps/web/src/components/ui/](apps/web/src/components/ui/). The CommandPalette ([command-palette.tsx](apps/web/src/components/dashboard/shell/command-palette.tsx)) manually wraps `CommandDialog` in `<Command>` because v4.7 doesn't.

### State management (ADR-005)

- **Server state** → TanStack Query (only via the hooks in [apps/web/src/lib/queries/index.ts](apps/web/src/lib/queries/index.ts))
- **Local state beyond `useState`** → Zustand stores in [apps/web/src/lib/stores/](apps/web/src/lib/stores/), one per concern (`ui`, `pending`, `drafts`, `mobile`, `auth`). Persistence is **selective via `partialize`** — don't blindly persist whole stores.

### i18n

`next-intl` with `fr` (default), `en`, `ar` (RTL). Config in [apps/web/src/i18n/config.ts](apps/web/src/i18n/config.ts). When adding strings, prefer `useTranslations()` over raw French literals; new components should be i18n-ready even if only `fr` messages exist initially.

## Conventions enforced by reviewers

- **Conventional Commits** required (`feat(scope):`, `fix(scope):`, `chore(scope):` …); branch naming `feat/…`, `fix/…`, etc.
- **TS strict** — no `any` without an inline justification comment
- **No raw apostrophe in JSX** → `&apos;` (eslint `react/no-unescaped-entities`)
- **CSP-friendly** — no inline scripts; styles are allowed via `'unsafe-inline'` only (see CSP in [main.ts](apps/api/src/main.ts))
- **Major architectural changes need an ADR first** in [docs/adr/](docs/adr/) (MADR format, sequential numbering, status `proposed` → `accepted`)
- Two reviewers for `feat` PRs (front + back if cross-cutting), CODEOWNERS auto-assigns

## .env loading order (important footgun)

[main.ts](apps/api/src/main.ts) loads `.env` from the monorepo root **first** with `override: true`, then from `apps/api/.env`. `ConfigModule` is also configured with this order in [app.module.ts](apps/api/src/app.module.ts). If you change an env value in `.env` and the API still reads the old one, suspect a shell-inherited variable — the `override: true` was added precisely to defeat that case, but only inside the Node process; **a stale `CORS_ORIGIN` exported in your shell will still leak into other tooling**.

## Where things live (skip discovery time)

- API module bootstrap: [apps/api/src/app.module.ts](apps/api/src/app.module.ts), [apps/api/src/main.ts](apps/api/src/main.ts)
- Shared NestJS plumbing (cache, circuit-breaker, idempotency, timeout, request-id, problem-details, feature-flags, env validation): [apps/api/src/common/](apps/api/src/common/)
- Prisma schema + migrations + seed: [packages/db/prisma/](packages/db/prisma/)
- Web routes: [apps/web/src/app/](apps/web/src/app/) — `(marketing)` group for landing, `/dashboard/*` for app, `/mobile/*` for journalist mobile views
- ADRs (read these before structural changes): [docs/adr/](docs/adr/)
- SLOs / observability targets: [docs/SLO.md](docs/SLO.md)
- n8n integration plan: [docs/N8N-INTEGRATION-PLAN.md](docs/N8N-INTEGRATION-PLAN.md) + [ADR-011](docs/adr/011-n8n-integration.md)
- Go-live / deploy runbooks: [docs/GO-LIVE-RUNBOOK.md](docs/GO-LIVE-RUNBOOK.md), [docs/DEPLOY-HOSTINGER.md](docs/DEPLOY-HOSTINGER.md)
