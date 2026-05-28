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

## Local Development

1. Copy `backend/.env.example` to `backend/.env` and set `API_KEY` and `DATABASE_URL`.
2. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_BACKEND_URL`.
3. Start the stack: `make dev-up`.
4. Run migrations once: `docker exec -t diagram_backend_dev npm run migrate:up`.

## API Authentication

All endpoints require `X-API-Key`. See [docs/api-auth.md](docs/api-auth.md).
