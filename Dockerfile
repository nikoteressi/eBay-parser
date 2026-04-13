FROM node:25-slim AS builder

WORKDIR /app

# Enable native builds for better-sqlite3 in case there's no pre-built binary
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:25-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/ebay-tracker.db
ENV NODE_PATH=/app/node_modules

COPY --from=builder /app/.output /app/.output
# Required to run drizzle migrations programmatically if needed in future
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/server/database/migrations /app/server/database/migrations


EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
