# =============================================================================
# CMR API — NestJS production image (ADR-006 baseline)
# Build : docker compose --profile app build api
# =============================================================================

# ---- Base image with pnpm -------------------------------------------------
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
WORKDIR /app

# ---- Dependencies layer ---------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile --filter @cmr/api... --filter @cmr/db...

# ---- Build layer ----------------------------------------------------------
FROM deps AS build
COPY packages packages
COPY apps/api apps/api
RUN cd packages/db && pnpm prisma generate
RUN cd apps/api && pnpm build

# ---- Runtime image --------------------------------------------------------
FROM node:22-alpine AS runtime
RUN apk add --no-cache tini dumb-init && addgroup -S cmr && adduser -S cmr -G cmr
WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts only — no dev deps, no source
COPY --from=build --chown=cmr:cmr /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=cmr:cmr /app/apps/api/package.json ./apps/api/
COPY --from=build --chown=cmr:cmr /app/packages/db ./packages/db
COPY --from=build --chown=cmr:cmr /app/node_modules ./node_modules
COPY --from=build --chown=cmr:cmr /app/package.json ./

USER cmr
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q -O- http://localhost:4000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/main.js"]
