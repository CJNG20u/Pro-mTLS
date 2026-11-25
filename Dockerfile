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
CMD ["npx", "tsx", "server.ts"]
