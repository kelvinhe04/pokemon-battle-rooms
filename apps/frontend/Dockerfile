FROM node:20-slim AS deps
RUN npm install -g pnpm@9
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install --filter frontend --no-frozen-lockfile

# @tanstack/start-config@1.120.20 imports CONSTANTS and startAPIRouteSegmentsFromTSRFilePath
# from @tanstack/router-generator, but the installed version lacks those exports.
RUN for RG in $(find /app/node_modules/.pnpm -path "*/router-generator/dist/esm/index.js" 2>/dev/null); do \
      grep -q 'CONSTANTS' "$RG" || \
        printf '\nexport const CONSTANTS = { APIRouteExportVariable: "APIRoute" };\nexport function startAPIRouteSegmentsFromTSRFilePath() { return []; }\n' >> "$RG"; \
    done && echo "router-generator patched"

RUN for SF in $(find /app/node_modules/.pnpm -path "*/server-functions-plugin/dist/esm/index.js" 2>/dev/null); do \
      grep -q 'createTanStackServerFnPlugin' "$SF" || \
        printf '\nexport function createTanStackServerFnPlugin(opts) { return { name: "tanstack-server-fn", ...opts }; }\n' >> "$SF"; \
    done && echo "server-functions-plugin patched"

RUN for RSP in $(find /app/node_modules/.pnpm -path "*/react-start-plugin/dist/esm/index.js" 2>/dev/null); do \
      grep -q 'createTanStackStartPlugin' "$RSP" || \
        printf '\nexport { TanStackStartVitePlugin as createTanStackStartPlugin };\n' >> "$RSP"; \
    done && echo "react-start-plugin patched"

FROM node:20-slim
RUN npm install -g pnpm@9
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/frontend ./apps/frontend/

WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["pnpm", "run", "dev"]
