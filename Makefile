DEV_CMD   = docker compose -p diagram-dev -f compose.yml -f compose.dev.yml
PROD_CMD  = docker compose -p diagram-prod -f compose.yml -f compose.prod.yml
DEV_PROJECT = diagram-dev
PROD_PROJECT = diagram-prod

exec:
	@echo "**---------Checking Frontend...-----------**"
	docker exec -t diagram_frontend_dev sh -c "(npm run lint && npm run typecheck && npm audit) && npm outdated || true && npm prune"
	
	@echo "**---------Checking Backend...-----------**"
	docker exec -t diagram_backend_dev sh -c "(npm run lint && npm run typecheck && npm audit) && npm outdated || true && npm prune"

lint:
	docker exec -t auth_frontend_dev sh -c "npm run lint"
	docker exec -t auth_backend_dev sh -c "npm run lint"

# DEV
build:
	$(DEV_CMD) build
buildcache:
	$(DEV_CMD) build --no-cache
down:
	$(DEV_CMD) down

PORTS = 5050 5223 5432

check-ports:
	@scripts/port-claimer.sh --self $(DEV_PROJECT) $(PORTS)

up: check-ports
	$(DEV_CMD) up -d
logs:
	$(DEV_CMD) logs -f
migrate-up:
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
	@if [ -z "$(DB_URL)" ]; then \
		echo "ERROR: DB_URL is required. Usage: make prod-migrate-up DB_URL='postgresql://doadmin:pass@host:25060/diagramdb?sslmode=require'"; \
		exit 1; \
	fi
	@echo "Connecting to $(DB_URL)..."
	sudo nix --extra-experimental-features "nix-command flakes" shell nixpkgs#postgresql --command psql '$(DB_URL)' -c "GRANT ALL ON SCHEMA public TO diagram; ALTER SCHEMA public OWNER TO diagram;"
	nix --extra-experimental-features "nix-command flakes" shell nixpkgs#kubectl --command kubectl exec deploy/diagram-backend -- npm run migrate:up

# Observability
lgtm-logs:
	cd lgtm && docker compose logs -f
lgtm-up:
	cd lgtm && docker compose up -d
lgtm-down:
	cd lgtm && docker compose down -v --rmi local

# Chaos
chaos-sh:
	cd scripts && API_KEY="zxczxc" ./chaos_test.sh
chaos-py:
	cd scripts && API_KEY="zxczxc" python chaos_test.py
locust:
	locust -f scripts/locust.py --host=http://localhost:5050
nix-locust:
	nix-shell -p 'python3.withPackages (ps: with ps; [ locust python-dotenv ])' --run 'locust -f scripts/locust.py --host=http://localhost:5050'
