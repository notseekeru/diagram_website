# Diagram Website

[![React](https://img.shields.io/badge/react-17.0.2-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-4.5.4-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/tailwind--css-2.2.19-blue.svg)](https://tailwindcss.com/)
[![Prettier](https://img.shields.io/badge/prettier-2.5.1-blue.svg)](https://prettier.io/)
[![ESLint](https://img.shields.io/badge/eslint-8.4.1-blue.svg)](https://eslint.org/)
[![Node.js](https://img.shields.io/badge/node--js-16.14.0-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/express-4.17.3-green.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-14.5-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/docker-20.10.12-blue.svg)](https://www.docker.com/)

[![OpenTelemetry](https://img.shields.io/badge/opentelemetry-1.0.0-blue.svg)](https://opentelemetry.io/)
[![Grafana](https://img.shields.io/badge/grafana-8.5.2-blue.svg)](https://grafana.com/)
[![Prometheus](https://img.shields.io/badge/prometheus-2.33.1-blue.svg)](https://prometheus.io/)
[![Loki](https://img.shields.io/badge/loki-2.4.1-blue.svg)](https://grafana.com/oss/loki/)
[![Tempo](https://img.shields.io/badge/tempo-1.0.0-blue.svg)](https://grafana.com/oss/tempo/)
[![Alloy](https://img.shields.io/badge/alloy-1.0.0-blue.svg)](https://alloydb.google.dev/)
[![Alertmanager](https://img.shields.io/badge/alertmanager-0.24.0-blue.svg)](https://prometheus.io/docs/alerting/latest/alertmanager/)
[![Postgres Exporter](https://img.shields.io/badge/postgres--exporter-0.10.0-blue.svg)](https://github.com/prometheus-community/postgres_exporter)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/yourusername/diagram-website/workflows/ci-pipeline/badge.svg)]

## Overview

This repository contains the source code for my personal mermaid diagrams. I use these diagrams to visualize various concepts, processes, and systems in a clear and concise manner. The diagrams are created using the Mermaid syntax, which allows for easy creation of flowcharts, sequence diagrams, class diagrams, and more.

## Tech Stack

- Mermaid.js: A JavaScript-based diagramming and charting tool that uses a simple markdown-like syntax to create diagrams.
- Vite: A build tool that provides a fast development environment and optimized production builds.
- React: A JavaScript library for building user interfaces, which I use to create interactive diagrams.
- TypeScript: A typed superset of JavaScript that compiles to plain JavaScript, providing better tooling and error checking.
- Tailwind CSS: A utility-first CSS framework that allows for rapid styling of components.
- Prettier: An opinionated code formatter that helps maintain consistent code style across the project.
- ESLint: A static code analysis tool that identifies and fixes problems in JavaScript code, ensuring code quality and consistency.
- Node.js: A JavaScript runtime built on Chrome's V8 JavaScript engine, used for running the development server and build scripts.
- Express: A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications, used to serve the diagrams.
- PostgreSQL: A powerful, open-source object-relational database system that uses and extends the SQL language, used for storing diagram data and user information.
- Docker: A platform for developing, shipping, and running applications in containers, used to containerize the application for easy deployment.

## Observability Stack

- OpenTelemetry: A collection of tools, APIs, and SDKs for instrumenting, generating, collecting, and exporting telemetry data (traces, metrics, logs) to help you analyze your software's performance and behavior.
- Grafana: An open-source platform for monitoring and observability, used to visualize the telemetry data collected by OpenTelemetry.
- Prometheus: An open-source systems monitoring and alerting toolkit, used to collect and store metrics data from the application.
- Loki: A horizontally-scalable, highly-available, multi-tenant log aggregation system inspired by Prometheus, used to collect and store log data from the application.
- Tempo: A high-scale distributed tracing backend, used to collect and store trace data from the application.
- Alloy: A lightweight, high-performance time-series database, used to store and query the telemetry data collected by OpenTelemetry.
- Alertmanager: A component of the Prometheus ecosystem that handles alerts sent by client applications, used to manage and route alerts based on defined rules and configurations.
- Postgres Exporter: A Prometheus exporter for PostgreSQL metrics, used to expose database metrics to Prometheus for monitoring and alerting.

## Local Development

1. Copy `backend/.env.example` to `backend/.env` and set `API_KEY` and `DATABASE_URL`.
2. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_BACKEND_URL`.
3. Start the stack: `make dev-up`.
4. Run migrations once: `docker exec -t diagram_backend_dev npm run migrate:up`.

## API Authentication

All endpoints require `X-API-Key`. See [docs/api-auth.md](docs/api-auth.md).

## Chaos Engineering

All chaos experiments are defined in `scripts/` and can be executed with `make chaos-run`. See [docs/chaos.md](docs/chaos.md) for more details.
