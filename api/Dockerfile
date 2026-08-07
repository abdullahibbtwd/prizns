# syntax=docker/dockerfile:1
# Avoid `npm prune` in the build stage — on small Coolify hosts it often gets
# OOM-killed (exit 255, log ends mid-step with no ERROR).

FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Dummy URL only so `prisma generate` can parse the schema during build.
ENV DATABASE_URL="postgresql://prizn:prizn@localhost:5432/prizn?schema=public"
RUN npx prisma generate
RUN npm run build
RUN npm run prisma:seed:build

# Fresh production install — lighter than prune of a full monorepo node_modules.
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
ENV DATABASE_URL="postgresql://prizn:prizn@localhost:5432/prizn?schema=public"
RUN npm ci --omit=dev \
  && npx prisma generate

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
