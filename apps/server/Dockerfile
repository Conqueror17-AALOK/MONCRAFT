FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/server/package*.json ./apps/server/
COPY contracts/package*.json ./contracts/

# Install dependencies across monorepo
RUN npm ci

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Build shared package then server
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/server

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV SERVER_PORT=4000
ENV SERVER_HOST=0.0.0.0

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/server/package*.json ./apps/server/
COPY contracts/package*.json ./contracts/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist

RUN mkdir -p /app/data

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "apps/server/dist/index.js"]
