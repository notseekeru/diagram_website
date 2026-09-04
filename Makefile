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
	docker exec -t diagram_frontend_dev sh -c "npm run lint"
	docker exec -t diagram_backend_dev sh -c "npm run lint"

test:
	docker exec -t diagram_backend_dev sh -c "npm run test"
# DEV
build:
	$(DEV_CMD) build
buildcache:
	$(DEV_CMD) build --no-cache
down:
	$(DEV_CMD) down
	docker network remove obs-network || true

clean:
	$(DEV_CMD) down -v
	docker network remove obs-network || true
PORTS = 3100 5273 5432

check-ports:
	@scripts/port-claimer.sh --self $(DEV_PROJECT) $(PORTS)

up: check-ports
	docker network create obs-network || true
	$(DEV_CMD) up -d
logs:
	$(DEV_CMD) logs -f
# Migrations (node-pg-migrate)
migrate:
	docker exec -t diagram_backend_dev npm run migrate:up

migrate-up: migrate

rollback:
	docker exec -t diagram_backend_dev npm run migrate:down

new-migration:
	@test -n "$(name)" || (echo "usage: make new-migration name=<name>" && exit 1)
	docker exec -t diagram_backend_dev npm run migrate:create --name $(name)

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
	$(PROD_CMD) down -v

prod-scan: prod-build
	@echo '**--- Trivy image scan: diagram-prod-<service> ---**'
	for img in frontend backend; do \
		echo "== scanning diagram-prod-$$img =="; \
		docker run --rm \
			-v /var/run/docker.sock:/var/run/docker.sock \
			-v $(CURDIR)/$$img/.trivyignore.yaml:/.trivyignore.yaml \
			aquasec/trivy:0.74.0 image \
			--skip-dirs "app/node_modules" \
			--severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 \
			--ignorefile /.trivyignore.yaml \
			diagram-prod-$$img; \
	done
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
	cd lgtm && docker compose down -v

# Chaos
chaos-sh:
	cd scripts && API_KEY="zxczxc" ./chaos_test.sh
chaos-py:
	cd scripts && API_KEY="zxczxc" python3 chaos_test.py

LOCUST_IMG ?= locustio/locust:latest
BACKEND_URL ?= http://diagram_backend_dev:3100
LOCUST = docker run --rm -u "$$(id -u):$$(id -g)" -v "$(CURDIR):/app" -w /app --network=obs-network -p 8089:8089 $(LOCUST_IMG)

locust:
	$(LOCUST) -f /app/scripts/locust.py --host=$(BACKEND_URL)
locust-csv:
	$(LOCUST) -f /app/scripts/locust.py --host=$(BACKEND_URL) --headless -u 100 -r 10 -t 5m --csv=/app/results
