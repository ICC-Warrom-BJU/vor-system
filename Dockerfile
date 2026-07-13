FROM node:20-alpine

WORKDIR /app

COPY vor-backend/package.json ./

# --include=dev wajib: runtime butuh tsx (start) & prisma CLI (migrate deploy),
# keduanya di devDependencies. Tanpa ini, NODE_ENV=production akan melewatinya
# dan CMD (migrate deploy && npm start) gagal.
RUN npm install --include=dev

COPY vor-backend/ .

RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
