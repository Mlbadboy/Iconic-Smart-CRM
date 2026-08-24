FROM node:20-alpine

WORKDIR /app

# Copy package manifests and install root production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy all source code including public/ CRM application
COPY . .

EXPOSE 7000

CMD ["node", "server.js"]
