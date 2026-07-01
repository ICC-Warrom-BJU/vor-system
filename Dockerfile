FROM node:20-alpine

WORKDIR /app

COPY vor-backend/ .

RUN npm ci && npx prisma generate

EXPOSE 3000
CMD ["npm", "start"]
