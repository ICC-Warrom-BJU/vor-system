FROM node:20-alpine

WORKDIR /app

COPY vor-backend/ .

RUN npm install && npx prisma generate

EXPOSE 3000
CMD ["npm", "start"]
