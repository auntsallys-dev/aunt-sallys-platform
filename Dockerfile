FROM node:22-slim AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy everything
COPY . .

# Install dependencies (no frozen lockfile - monorepo lockfile may drift)
RUN pnpm install --no-frozen-lockfile

# Build POS frontend
RUN cd apps/pos && npx vite build

# Copy POS build to API public dir
RUN mkdir -p apps/api/public && cp -r apps/pos/dist/* apps/api/public/

EXPOSE 10000
ENV NODE_ENV=production
ENV PORT=10000

CMD ["node", "apps/api/start.cjs"]
