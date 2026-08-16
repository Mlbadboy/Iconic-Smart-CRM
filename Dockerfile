FROM node:20-alpine

WORKDIR /app

# Copy package manifests and install root production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy client manifests, install client dependencies and build React app
COPY client/package*.json ./client/
RUN cd client && npm install --legacy-peer-deps

COPY client ./client
RUN cd client && npm run build

# Copy remaining backend source code
COPY . .

EXPOSE 7000

CMD ["node", "server.js"]
