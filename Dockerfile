FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN npm install -g serve --no-audit --no-fund
COPY --from=frontend-builder /app/build ./build

EXPOSE 3001
CMD ["sh", "-c", "serve -s build -l ${PORT:-3001}"]
