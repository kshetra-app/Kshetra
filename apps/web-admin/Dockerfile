FROM node:22-alpine AS builder

WORKDIR /app

# Install from the admin's own lockfile. Its local shared-package reference
# keeps the shared TypeScript source available without bringing in unrelated
# API, mobile, or test-tool dependencies.
COPY packages/shared ./packages/shared
COPY apps/web-admin/package.json apps/web-admin/package-lock.json ./apps/web-admin/

WORKDIR /app/apps/web-admin
RUN npm ci --workspaces=false --no-audit --no-fund

# Copy source code
COPY apps/web-admin ./

# The admin's tsconfig maps the shared workspace source directly.
RUN npm run build

# Production static serving
FROM nginx:alpine
COPY --from=builder /app/apps/web-admin/dist /usr/share/nginx/html
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
