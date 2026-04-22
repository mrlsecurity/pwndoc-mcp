# Multi-stage build:
# 1. deps  → install with --ignore-scripts (blocks postinstall arbitrary code execution)
# 2. build → compile TypeScript
# 3. test  → run vitest unit tests (target this stage in docker build to verify)
# 4. runtime → minimal image with only prod deps + dist/
#
# All npm install + build + test work happens INSIDE the container; nothing touches the host.

ARG NODE_IMAGE=node:20.18.1-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json ./
# --ignore-scripts: refuse to execute arbitrary postinstall hooks from any package
RUN npm install --ignore-scripts --no-audit --no-fund

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM build AS test
COPY tests ./tests
# Vitest needs to discover tests; run once and exit non-zero on failure
RUN npx vitest run

FROM ${NODE_IMAGE} AS audit
WORKDIR /app
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
# Print audit + outdated for the user's review; non-zero exit on high/critical
RUN npm audit --audit-level=high || (echo "AUDIT FAILED — review above" && exit 1)

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
COPY --from=build /app/dist ./dist
USER node
ENTRYPOINT ["node", "dist/server.js"]
