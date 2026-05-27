DEV_CMD  = docker compose -p diagram-dev -f compose.yml -f compose.dev.yml
PROD_CMD = docker compose -p diagram-prod -f compose.yml -f compose.prod.yml

exec:
	@echo "**---------Checking Frontend...-----------**"
	docker exec -t diagram_frontend_dev sh -c "(npm run lint && npm run typecheck && npm audit) && npm outdated || true"
	
	@echo "**---------Checking Backend...-----------**"
	docker exec -t diagram_backend_dev sh -c "(npm run lint && npm run typecheck && npm audit) && npm outdated || true"
	
git-branch-d:
	git checkout main
	git pull origin main
	git branch --merged | xargs git branch -d

dev-build:
	$(DEV_CMD) build

dev-buildcache:
	$(DEV_CMD) build --no-cache

dev-down:
	$(DEV_CMD) down -v --rmi local

dev-up:
	$(DEV_CMD) up -d

dev-logs:
	$(DEV_CMD) logs -f

prod-build:
	$(PROD_CMD) build

prod-buildcache:
	$(PROD_CMD) build --no-cache

prod-up:
	$(PROD_CMD) up -d

prod-logs:
	$(PROD_CMD) logs -f

prod-down:
	$(PROD_CMD) down -v --rmi local
