FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm install --include=dev

COPY . .

RUN npm run build:css

EXPOSE 3000

CMD ["node", "app.js"]
# Test pull request