FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY src/shared/package.json src/shared/
COPY src/backend/package.json src/backend/

RUN pnpm install --frozen-lockfile --filter @codex/backend --filter @codex/shared

COPY src/shared/ src/shared/
COPY src/backend/ src/backend/

RUN pnpm --filter @codex/shared run build 2>/dev/null || true
RUN pnpm --filter @codex/backend run build 2>/dev/null || true

FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY --from=builder /app .

RUN mkdir -p /data

EXPOSE 3001
CMD ["node", "--max-old-space-size=1024", "src/backend/dist/server.js"]
