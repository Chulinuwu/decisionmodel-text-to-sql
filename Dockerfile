FROM node:22-alpine
RUN apk add --no-cache python3
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx vite build
ENV HOST=0.0.0.0
EXPOSE 4317
CMD ["node", "--import", "tsx", "server/index.ts"]
