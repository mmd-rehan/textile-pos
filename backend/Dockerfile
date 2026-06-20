# TextilePOS backend image — multi-stage build.
#
#   builder : install all deps, generate the Prisma client, compile NestJS.
#   runtime : production image that runs migrations + standard seed, then the API.
#
# Both stages share node:20-bookworm-slim so the Prisma "native" query engine
# built in the builder matches the runtime OS/libc. OpenSSL is required by Prisma.

# ---- Builder ---------------------------------------------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install dependencies (full set, incl. dev — needed to compile Nest and to run
# the TypeScript seed via ts-node at container startup). We use `npm install`
# (not `npm ci`) to match how this repo manages deps elsewhere (scripts/setup.sh,
# frontend) and to tolerate minor package.json/lockfile drift; the lockfile is
# copied so resolution stays close to it.
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Generate the Prisma client (needs the schema + migrations).
COPY prisma ./prisma
RUN npx prisma generate

# Compile the NestJS app to dist/.
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- Runtime ---------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Bring over installed deps and the compiled app. We intentionally keep the full
# node_modules (no prune): the standard seed runs through
# `prisma db seed` -> `ts-node prisma/seed.ts`, so the Prisma CLI + ts-node +
# typescript must stay available in the image.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

# Source-of-truth files the entrypoint needs at runtime.
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node package.json package-lock.json tsconfig.json ./
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

# Persistent storage for purchase attachments. The app resolves attachments to
# <cwd>/storage/purchase-attachments, i.e. /app/storage; mounted as a named
# volume in docker-compose so uploads survive container restarts/rebuilds.
RUN mkdir -p /app/storage/purchase-attachments \
 && chown -R node:node /app/storage \
 && chmod +x /app/docker-entrypoint.sh

USER node
EXPOSE 5001

ENTRYPOINT ["./docker-entrypoint.sh"]
