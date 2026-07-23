# --- BASE IMAGE FOR BACKEND
FROM node:lts-alpine3.24 AS base

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN chown node:node /app

USER node

RUN npm ci

COPY --chown=node:node . . 

# --- DEV // RUN AS NODE USER
FROM base AS dev

EXPOSE 3100

CMD ["npm", "run", "dev:otel"]

# --- PRUNE // RUN AS NODE USER
FROM base AS prune

RUN npm run build && npm prune --omit=dev

# --- PROD NEW IMAGE // RUN AS NODE USER
FROM node:lts-alpine3.24 AS prod

RUN apk add --no-cache --upgrade musl musl-utils zlib

ENV NODE_ENV=production

#SET ANOTHER WORKDIR BECAUSE YOU HAVE STARTED A NEW IMAGE
RUN mkdir /app && chown node:node /app

WORKDIR /app

COPY --from=prune /app .

USER node

CMD ["npm", "run", "start:otel"]
