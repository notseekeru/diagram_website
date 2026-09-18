# --- BASE IMAGE FOR FRONTEND
FROM node:lts-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS base

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
FROM nginxinc/nginx-unprivileged:1.31.6@sha256:e44b470e571b20d935336bfb9f8277c1468d15e1e4d105a12ab5609d0b4682cb AS prod

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
