# =============================================================================
# CMR Web — Next.js 16 standalone (production)
# =============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
WORKDIR /app

# ---- Dependencies ---------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile --filter @cmr/web...

# ---- Build ---------------------------------------------------------------
FROM deps AS build
COPY packages packages
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && pnpm build

# ---- Runtime --------------------------------------------------------------
FROM node:22-alpine AS runtime
RUN apk add --no-cache tini && addgroup -S cmr && adduser -S cmr -G cmr
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Next.js standalone output (configure in next.config.ts)
COPY --from=build --chown=cmr:cmr /app/apps/web/.next/standalone ./
COPY --from=build --chown=cmr:cmr /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=cmr:cmr /app/apps/web/public ./apps/web/public

USER cmr
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s \
  CMD wget -q -O- http://localhost:3000/api/health || wget -q -O- http://localhost:3000/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
