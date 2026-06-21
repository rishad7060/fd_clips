# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy lockfile (if any) alongside package.json and prefer ci for reproducibility
COPY package*.json ./
RUN npm ci || npm install

# ── Stage 2: build the Next.js app ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* vars are inlined at build time, so they must arrive as build args
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Bring in installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ── Stage 3: minimal production runner ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone output contains its own node_modules and server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Static assets must live at .next/static inside the standalone tree
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Public directory is served directly by the standalone server
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# next.js standalone emits server.js at the root of the standalone folder
CMD ["node", "server.js"]
