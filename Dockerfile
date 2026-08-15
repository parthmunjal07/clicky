FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --include=dev

COPY backend ./
RUN npm run build

FROM nginx:1.27-alpine
WORKDIR /app

RUN apk add --no-cache nodejs npm

COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY --from=backend-build /app/backend/package*.json /app/backend/
COPY --from=backend-build /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-build /app/backend/dist /app/backend/dist
COPY --from=backend-build /app/backend/src /app/backend/src
COPY --from=backend-build /app/backend/drizzle /app/backend/drizzle
COPY --from=backend-build /app/backend/drizzle.config.js /app/backend/drizzle.config.js

RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '  location /auth { proxy_pass http://127.0.0.1:5000; }' \
  '  location /admin { proxy_pass http://127.0.0.1:5000; }' \
  '  location /health { proxy_pass http://127.0.0.1:5000; }' \
  '  location /users { proxy_pass http://127.0.0.1:5000; }' \
  '  location /leaderboard { proxy_pass http://127.0.0.1:5000; }' \
  '  location /game { proxy_pass http://127.0.0.1:5000; }' \
  '}' > /etc/nginx/conf.d/default.conf

RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -eu' \
  'export PORT="${PORT:-5000}"' \
  'export NODE_ENV="${NODE_ENV:-production}"' \
  'cd /app/backend' \
  'node dist/server.js &' \
  'exec nginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
