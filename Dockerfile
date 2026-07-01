FROM node:20-alpine

WORKDIR /app

COPY vor-backend/package.json ./

RUN npm install

COPY vor-backend/ .

RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
