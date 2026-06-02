# syntax=docker/dockerfile:1
#
# Multi-stage build for the staff dashboard, deployed to AWS Fargate behind
# the shared ragserv ALB (see ../ragserv/terraform/admin_ui.tf). Built and
# pushed by scripts/deploy-admin.sh.
#
# Requires `output: 'standalone'` in next.config.ts. Follows the official
# Next.js standalone Docker example (alpine + libc6-compat + non-root user).
#
# The four NEXT_PUBLIC_* values are inlined into the *client* bundle during
# `next build`, so they must be present at BUILD time as --build-arg, not at
# runtime. None are secret (public URLs + the Supabase publishable anon key).
# The one true runtime secret, SESSION_SECRET, is injected by the task
# definition from SSM — never baked into the image.

FROM node:22-alpine AS base

# ---- deps: install the full dependency tree (build needs devDependencies) ----
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile Next in standalone mode ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_RAGSERV_URL
ARG NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_RAGSERV_URL=$NEXT_PUBLIC_RAGSERV_URL \
    NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL=$NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- runner: minimal image that serves the standalone server ----
FROM base AS runner
WORKDIR /app

# HOSTNAME=0.0.0.0 is the key container gotcha: the standalone server binds
# localhost by default, which the ALB health check can't reach.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
