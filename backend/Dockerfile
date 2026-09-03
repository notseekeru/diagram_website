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

# Strip the base image's bundled global npm + corepack (dead weight in
# this image: prod boots node directly, never the npm CLI). Removing
# them also clears the 4 HIGH/CRITICAL package CVEs they drag in
# (brace-expansion, ip-address, node-tar under /usr/local/lib/node_modules/npm).
RUN rm -rf /usr/local/lib/node_modules/npm \
	/usr/local/lib/node_modules/corepack \
	/usr/local/bin/npm \
	/usr/local/bin/npx \
	/usr/local/bin/corepack

RUN apk add --no-cache --upgrade --latest musl musl-utils zlib libcrypto3 libssl3 expat

ENV NODE_ENV=production

#SET ANOTHER WORKDIR BECAUSE YOU HAVE STARTED A NEW IMAGE
RUN mkdir /app && chown node:node /app

WORKDIR /app

COPY --from=prune /app .

USER node

# Equivalent of `npm run start:otel`, without the sh/npm indirection
CMD ["node", "--import", "./dist/instrumentation.js", "dist/server.js"]
