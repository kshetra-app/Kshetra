FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package manifests
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web-admin/package.json ./apps/web-admin/

# Install dependencies
RUN npm install --force

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web-admin ./apps/web-admin

# Build shared and web-admin
RUN npm run build --prefix packages/shared
RUN npm run build --prefix apps/web-admin

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
