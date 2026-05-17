FROM node:22-alpine AS builder
WORKDIR /app
# Build deps for better-sqlite3 native binding (Alpine musl)
RUN apk add --no-cache python3 make g++ libc-dev
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
# Runtime: better-sqlite3's .node binary is already inside node_modules; no extra deps needed.
COPY --from=builder /app ./
# Ensure DB dir exists in container (mounted from host)
RUN mkdir -p /app/data
ENV NODE_ENV=production
ENV PORT=3000
ENV ATENU_DB_PATH=/app/data/atenu.db
EXPOSE 3000
CMD ["npm", "start"]
