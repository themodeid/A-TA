# -------------------------------------------------------------
# 1. Base Stage: Environment & Workdir
# -------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
ARG BACKEND_PORT=3040
ENV PORT=${BACKEND_PORT}

# -------------------------------------------------------------
# 2. Development Stage: Koding Harian & Hot-Reload
# -------------------------------------------------------------
FROM base AS development
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

COPY . .

EXPOSE ${PORT}

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# -------------------------------------------------------------
# 3. Builder Stage: Kompilasi TypeScript -> dist/
# -------------------------------------------------------------
FROM base AS builder
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build
# Pastikan berkas SQL migrasi ikut terbungkus ke dalam dist
RUN cp -r src/database/migrations dist/database/migrations

# -------------------------------------------------------------
# 4. Production Runner Stage: Minimalis, Ringan & Non-Root
# -------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production

# Install HANYA dependensi runtime produksi
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Ambil hasil kompilasi bersih dari stage builder
COPY --from=builder /app/dist ./dist

# Salin script entrypoint untuk pengecekan koneksi PostgreSQL
COPY --from=development /usr/local/bin/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Pasang wewenang non-root user (keamanan anti-container escape)
USER node

EXPOSE ${PORT}

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/app.js"]