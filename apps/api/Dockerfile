FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install from the API's standalone, lockfile-backed manifest. The monorepo
# root manifest includes unrelated mobile and test tooling, so it is not part
# of the deployed API image.
COPY packages/shared ./packages/shared
COPY data ./data
COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npm ci --omit=dev --workspaces=false --no-audit --no-fund

# Runtime Environment
ENV PORT=3001
ENV HOST=0.0.0.0
EXPOSE 3001
CMD ["node", "--import=tsx", "src/server.ts"]
