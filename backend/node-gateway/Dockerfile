FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

RUN mkdir -p uploads logs

EXPOSE 3000

CMD ["node", "src/server.js"]
