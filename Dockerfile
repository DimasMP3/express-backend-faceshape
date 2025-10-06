# Production Dockerfile for the backend (Bun + Express)
FROM oven/bun:1-debian

WORKDIR /app

# Native deps for sharp and TLS certs
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libvips \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=5000

# Install dependencies first for better caching
COPY package.json bun.lock* bun.lockb* ./
RUN bun install --frozen-lockfile --production || bun install --production

# Copy source
COPY . .

EXPOSE 5000

# Start the server (Bun can run TS directly)
CMD ["bun","src/server.ts"]

