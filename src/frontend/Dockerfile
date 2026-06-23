FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY src/shared/package.json src/shared/
COPY src/frontend/package.json src/frontend/

RUN pnpm install --frozen-lockfile --filter @codex/frontend --filter @codex/shared

COPY src/shared/ src/shared/
COPY src/frontend/ src/frontend/

RUN pnpm --filter @codex/shared run build 2>/dev/null || true
RUN pnpm --filter @codex/frontend run build

FROM nginx:alpine

COPY --from=builder /app/src/frontend/dist /usr/share/nginx/html
COPY src/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
