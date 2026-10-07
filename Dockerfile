FROM node:22-alpine

WORKDIR /app

# On copie d'abord package.json et on installe les dépendances (pg)
COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
