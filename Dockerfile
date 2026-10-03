# syntax = docker/dockerfile:1

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js/Prisma"
WORKDIR /app

# Build stage
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3

COPY package-lock.json package.json ./
RUN npm install

COPY prisma prisma/
RUN npx prisma generate

COPY . .

# Final runtime image
FROM base

ENV NODE_ENV="production"

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY --from=build /app /app

RUN mkdir -p /data/auths
VOLUME /data

ENTRYPOINT [ "/app/docker-entrypoint.js" ]

EXPOSE 3000
ENV DATABASE_URL="file:///data/dev.db"
ENV AUTHS_DIR="/data/auths"
ENV PORT=3000
ENV HOST=0.0.0.0

CMD [ "npm", "start" ]
