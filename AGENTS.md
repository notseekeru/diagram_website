## Project Convention

- Before creating or modifying any code, ensure you have a clear understanding of the existing infrastructure, repo structure, dependencies, indentation, inspections, naming conventions, format,and coding style used in the current codebase.
- Do not commit any secrets, sensitive information, tokens, private keys, runner registration tokens, webhooks urls or environment credentials to the repository.

## Project Structure

.
├── AGENTS.md
├── README.md
├── backend
│ ├── Dockerfile
│ ├── eslint.config.js
│ ├── node_modules
│ ├── package-lock.json
│ ├── package.json
│ ├── src
│ │ └── server.ts
│ └── tsconfig.json
├── compose.dev.yml
├── compose.prod.yml
├── compose.yml
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
