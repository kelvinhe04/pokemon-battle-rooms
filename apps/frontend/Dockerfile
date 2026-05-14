FROM node:20-slim
RUN npm install -g pnpm@9
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/frontend/package.json ./apps/frontend/

RUN pnpm install --filter frontend --no-frozen-lockfile

COPY apps/frontend ./apps/frontend/

WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["pnpm", "dev"]
