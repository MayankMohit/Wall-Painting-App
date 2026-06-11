# Stage 1: Install production dependencies only
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Full install + build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install without prebuilt binaries so sharp compiles natively on ARM64
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Minimal production image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone server (no node_modules needed for the web server itself)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Workers and their dependencies
COPY --from=builder /app/workers ./workers
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "server.js"]
