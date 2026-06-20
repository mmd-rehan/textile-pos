# TextilePOS frontend image — multi-stage build.
#
#   builder : install deps and produce the static Vite build.
#   runtime : Nginx serving the built SPA with history-API fallback.

# ---- Builder ---------------------------------------------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Browser-facing API base URL, baked in at build time (Vite inlines VITE_* vars
# into the bundle). It MUST be a URL the user's BROWSER can reach — e.g.
# http://localhost:5001/api/v1 or https://api.example.com/api/v1 — never the
# internal Docker service name `backend`, which the browser cannot resolve.
ARG VITE_API_BASE_URL=http://localhost:5001/api/v1

# The API client reads VITE_API_URL (see src/api/client.ts); expose the build arg
# under both names so the same absolute URL is used regardless of which is read.
ENV VITE_API_URL=$VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# No committed lockfile for the frontend workspace, so use npm install.
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Runtime (Nginx) -------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
