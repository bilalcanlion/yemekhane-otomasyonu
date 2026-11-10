FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Önce sadece paket dosyaları: kod değişince npm kurulumu tekrar yapılmaz
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

USER node
EXPOSE 8000
CMD ["node", "src/server.js"]
