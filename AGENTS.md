## Project Convention

- Before creating or modifying any code, ensure you have a clear understanding of the existing infrastructure, repo structure, dependencies, indentation, inspections, naming conventions, format,and coding style used in the current codebase.
- Do not commit any secrets, sensitive information, tokens, private keys, runner registration tokens, webhooks urls or environment credentials to the repository.

## Project Structure

├── AGENTS.md
├── README.md
├── backend
│ ├── Dockerfile
│ ├── eslint.config.js
│ ├── node_modules
│ ├── package-lock.json
│ ├── package.json
│ ├── src
│ │ ├── instrumentation.ts
│ │ ├── server.ts
│ │ └── smoke.ts
│ └── tsconfig.json
├── compose.dev.yml
├── compose.prod.yml
├── compose.yml
├── docs
│ └── slo.md
├── frontend
│ ├── Dockerfile
│ ├── eslint.config.js
│ ├── index.html
│ ├── nginx.conf
│ ├── node_modules
│ ├── package-lock.json
│ ├── package.json
│ ├── postcss.config.js
│ ├── public
│ ├── src
│ │ ├── App.tsx
│ │ ├── index.css
│ │ ├── main.tsx
│ │ └── vite-env.d.ts
│ ├── tailwind.config.js
│ ├── tsconfig.json
│ └── vite.config.js
└── makefile

## Task

- Implement a diagram website with a React frontend and a Node.js backend.
- The backend should have an API endpoint to save diagrams and another to retrieve them.
- The frontend should allow users to create diagrams using a simple interface and save them to the backend.
- Use Docker to containerize both the frontend and backend applications.
- Implement OpenTelemetry instrumentation in both the backend to collect traces and metrics.
- Setup PostgreSQL as the database to store the diagrams.
- Keep it simple and focus on readability, keep in mind the scale is only on the hundreds.
- Implement a Service Level Objective (SLO) for the API endpoint that saves diagrams, and ensure that the backend meets this SLO.

## Mandate

- Analyze the requirements and constraints of the project before starting to code. Understand the problem domain, the user needs, and the technical requirements to ensure that your implementation is aligned with the project goals.
- Keep the references date grounded to search for the most recent and relevant information. Do not be lazy and use the most up-to-date information available. Use search engines, official documentation, and other reliable sources to gather information and ensure that your implementation is based on the latest best practices and standards.
- Do not assume any requirements or constraints that are not explicitly stated. Always ask for clarification if needed. Use VSCODE Popup questions to ask for clarification on any requirements or constraints that are not clear.
- Keep the codebase clean, well-documented, and maintainable.
- Ensure that the application is secure and does not expose any vulnerabilities.
