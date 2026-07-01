FROM node:20-alpine

WORKDIR /app

COPY vor-backend/package.json ./

RUN npm install

COPY vor-backend/ .

RUN rm -rf prisma/migrations

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate dev --name init 2>/dev/null; npm start"]
