# --- BASE IMAGE FOR FRONTEND
FROM node:lts-alpine3.23 AS base

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN chown node:node /app

USER node

RUN npm ci

COPY --chown=node:node . . 

# --- DEV AS NODE USER
FROM base AS dev

EXPOSE 5223

CMD ["npm", "run", "dev", "--", "--host"]

# --- BUILDER AS NODE USER
FROM base AS builder

RUN npm run build

# --- PROD AS NGINX UNPRIVILEGED
FROM nginxinc/nginx-unprivileged:1.31.2-alpine AS prod

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
