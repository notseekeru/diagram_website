# Makefile to check versions of observability stack containers
# Assumes standard container names

.PHONY: check-all tempo prometheus grafana alloy loki

# Run all version checks
check-all: tempo prometheus grafana alloy loki

# Check Tempo Version
tempo:
	@echo "--- Tempo Version ---"
	@docker exec tempo /tempo --version 2>&1 || echo "Failed to check Tempo"

# Check Prometheus Version
prometheus:
	@echo "--- Prometheus Version ---"
	@docker exec prometheus /bin/prometheus --version 2>&1 | head -n 1 || echo "Failed to check Prometheus"

# Check Grafana Version
grafana:
	@echo "--- Grafana Version ---"
	@docker exec grafana grafana -v 2>&1 || docker exec grafana grafana -v 2>&1 || echo "Failed to check Grafana"

# Check Grafana Alloy Version
alloy:
	@echo "--- Grafana Alloy Version ---"
	@docker exec alloy alloy --version 2>&1 | head -n 1 || echo "Failed to check Alloy"

# Check Grafana Loki Version
loki:
	@echo "--- Grafana Loki Version ---"
	@docker exec loki /usr/bin/loki --version 2>&1 || docker exec loki /loki --version 2>&1 || echo "Failed to check Loki"

volume-down:
	@echo "--- Deleting Volumes of Loki-Grafana-Tempo-Prometheus ---"
	@docker volume rm lgtm_loki-data lgtm_prometheus-data lgtm_tempo-data
	@echo "--- Deleting alloy-data Folder! ---"
	@sudo rm -rf alloy-data/**

