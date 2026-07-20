FROM node:18-alpine AS base
LABEL org.opencontainers.image.source="https://github.com/mhmdhabibrafi/ascit"
LABEL org.opencontainers.image.description="ASCIT application"
LABEL org.opencontainers.image.licenses="Proprietary"

# 1. Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1
RUN npm run build

# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
RUN apk add --no-cache openssl postgresql-client
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Prisma schema and migrations for runtime deployment
COPY --from=builder /app/prisma ./prisma
# Copy public folder
COPY --from=builder /app/public ./public
# Copy next.js standalone output and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Install prisma globally or locally so we can run migrate deploy
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
