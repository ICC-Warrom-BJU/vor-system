FROM node:20-alpine

WORKDIR /app

COPY vor-backend/package*.json ./
RUN npm ci

COPY vor-backend/prisma ./prisma
RUN npx prisma generate

COPY vor-backend/ .

EXPOSE 3000
CMD ["npm", "start"]
