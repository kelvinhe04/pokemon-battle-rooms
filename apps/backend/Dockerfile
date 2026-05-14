FROM oven/bun:1.1
WORKDIR /app/apps/backend

COPY apps/backend/package.json ./
RUN bun install

COPY apps/backend ./

EXPOSE 3001
CMD ["bun", "src/index.ts"]
