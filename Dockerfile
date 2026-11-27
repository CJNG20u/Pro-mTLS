# ---------- Build stage: install deps and build the React UI ----------
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
# npm install (not npm ci) so a slightly stale lockfile doesn't fail the build
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# openssl CLI is used to generate the CRL
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server.ts ./
COPY server ./server

# CA, client certs, CRL and settings live here: mount it as a volume
RUN mkdir -p /app/pki_storage && chmod 700 /app/pki_storage
VOLUME ["/app/pki_storage"]

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/auth/status').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npx", "tsx", "server.ts"]
