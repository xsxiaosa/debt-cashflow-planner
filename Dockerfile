FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm install --no-audit --no-fund

COPY client/ ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=3001

COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server/ ./
COPY --from=client-builder /app/client/build ./public

EXPOSE 3001
CMD ["node", "server.js"]
