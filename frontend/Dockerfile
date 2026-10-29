# --- BASE IMAGE FOR FRONTEND
FROM node:lts-alpine3.24@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS base

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN chown node:node /app

USER node

RUN npm ci

COPY --chown=node:node . . 

# --- DEV AS NODE USER
FROM base AS dev

EXPOSE 5273

CMD ["npm", "run", "dev", "--", "--host"]

# --- BUILDER AS NODE USER
FROM base AS builder

RUN npm run build

# --- PROD AS NGINX UNPRIVILEGED
FROM nginxinc/nginx-unprivileged:1.31.7@sha256:09b0d3eda2aa592d2487f284519419015cab010d7df16cd0fe224b585fc60eb6 AS prod

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
