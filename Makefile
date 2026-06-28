DEV_CMD  = docker compose -p diagram-dev -f compose.yml -f compose.dev.yml
PROD_CMD = docker compose -p diagram-prod -f compose.yml -f compose.prod.yml

# Linting

exec:
	@echo "**---------Checking Frontend...-----------**"
	docker exec -t diagram_frontend_dev sh -c "(npm run lint && npm run typecheck && npm audit) && npm outdated || true"
	
	@echo "**---------Checking Backend...-----------**"
	docker exec -t diagram_backend_dev sh -c "(npm run lint && npm run typecheck && npm audit) && npm outdated || true"

# DEV

dev-build:
	$(DEV_CMD) build

dev-buildcache:
	$(DEV_CMD) build --no-cache

dev-down:
	$(DEV_CMD) down

dev-up:
	$(DEV_CMD) up -d

dev-logs:
	$(DEV_CMD) logs -f

dev-migrate-up:
	docker exec -t diagram_backend_dev npm run migrate:up

# PROD

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

prod-migrate-up:
	sudo nix --extra-experimental-features "nix-command flakes" shell flake:nixpkgs#postgresql --command psql 'public-string-here' -c "GRANT ALL ON SCHEMA public TO diagram; GRANT ALL ON DATABASE diagramdb TO diagram;" && npm run migrate:up

# Observability stack

lgtm-logs:
	cd lgtm && docker compose logs -f

lgtm-up:
	cd lgtm && docker compose up -d

lgtm-down:
	cd lgtm && docker compose down -v --rmi local

# Obsevability and Chaos + Traffic Simulation

chaos-sh:
	cd scripts && API_KEY="zxczxc" ./chaos_test.sh

chaos-py:
	cd scripts && API_KEY="zxczxc" python chaos_test.py

locust:
	locust -f scripts/locust.py --host=http://localhost:5050
