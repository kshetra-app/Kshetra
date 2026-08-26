FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Copy root manifests & workspaces
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY data ./data

# Install dependencies with platform flexibility for Docker Linux container
RUN npm install --no-audit --no-fund --force

# Build shared package
RUN npm run build --prefix packages/shared

# Runtime Environment
ENV PORT=3001
ENV HOST=0.0.0.0
EXPOSE 3001
WORKDIR /app/apps/api

CMD ["npx", "tsx", "src/server.ts"]
