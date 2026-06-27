# syntax=docker/dockerfile:1
#
# KSHETRA Fastify API — container image.
#
# The API imports workspace code (@kshetra/shared) and seed data (data/seed),
# and the monorepo flat-hoists dependencies to the root, so this image is built
# from the REPOSITORY ROOT as the build context:
#
#   docker build -f apps/api/Dockerfile -t kshetra-api .
#   docker run --rm -p 3001:3001 kshetra-api
#
# The service is run via `tsx` (TypeScript executed directly) because the
# workspace consumes @kshetra/shared as TypeScript source. tsx is a runtime
# dependency of apps/api, so `--omit=dev` is safe.
#
# Works on any container host (Fly.io, Render, Railway, Cloud Run, ECS, etc.).

FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ---- Install dependencies ----
# Copy manifests + workspace sources needed for `npm ci` to resolve the graph.
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY data ./data

# Install production dependencies only (tsx is a runtime dep of apps/api).
RUN npm ci --omit=dev --no-audit --no-fund

# ---- Runtime ----
ENV PORT=3001 HOST=0.0.0.0
EXPOSE 3001
WORKDIR /app/apps/api

# Lightweight healthcheck against the public health route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
