# ── Stage 1: Build ──────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia tudo necessário para rodar
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 3000
# node_modules/.bin/prisma existe porque copiamos o node_modules completo
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node_modules/.bin/next start -p 3000"]
