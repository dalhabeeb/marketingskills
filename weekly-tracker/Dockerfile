FROM node:22-bookworm-slim

WORKDIR /app

# build-essential + python3 so better-sqlite3 can compile from source if no
# prebuilt binary matches the build platform's node/libc combination
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm install

COPY . .
RUN npm run build -w client

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "run", "start:server"]
