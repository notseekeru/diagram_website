# --- BASE IMAGE FOR FRONTEND
FROM node:lts-alpine3.24@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f AS base

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
FROM nginxinc/nginx-unprivileged:1.31.7@sha256:94193d5c4c5df716f412bb08eb97956d98fe6b59886f0bc57d6d3a3402a88a02 AS prod

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
