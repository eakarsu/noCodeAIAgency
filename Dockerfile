FROM node:26-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN npx prisma generate && npm run build

FROM node:26-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/scripts/validate-production-env.mjs ./scripts/validate-production-env.mjs
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/validate-production-env.mjs && exec node server.js"]

FROM dependencies AS worker
COPY --chown=node:node . .
ENV NODE_ENV=production
RUN npx prisma generate
USER node
CMD ["npm", "run", "worker:recommendations"]
