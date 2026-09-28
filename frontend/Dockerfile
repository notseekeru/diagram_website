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
FROM nginxinc/nginx-unprivileged:1.31.6@sha256:929e1d5e610e8aa89a1715ba44dce5edb4d42c172a208c171233292f472560c5 AS prod

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
