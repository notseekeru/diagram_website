#!/usr/bin/env bash
# Import a dashboard JSON into the running Grafana instance via the HTTP API.
#
# - Reads GRAFANA_PASSWORD from ../.env (your shell only — never echoed).
# - Resolves the Prometheus datasource UID at runtime and injects it into the
#   dashboard (which uses __PROM_UID__ as a placeholder).
# - Idempotent: overwrites the dashboard with the same uid.
#
# Usage (from lgtm/):
#   ./scripts/import-dashboard.sh
#   DASH=config/grafana/dashboards/other.json ./scripts/import-dashboard.sh
#   GRAFANA_URL=http://localhost:3001 ./scripts/import-dashboard.sh
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env}"
DASH="${DASH:-config/grafana/dashboards/golden-signals.json}"
BASE="${GRAFANA_URL:-http://localhost:3001}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found (expected in $PWD)" >&2
  exit 1
fi
if [[ ! -f "$DASH" ]]; then
  echo "ERROR: dashboard file not found: $DASH" >&2
  exit 1
fi

PASS="$(grep -E '^GRAFANA_PASSWORD=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '\r')"
if [[ -z "$PASS" ]]; then
  echo "ERROR: GRAFANA_PASSWORD is empty in $ENV_FILE" >&2
  exit 1
fi

echo "Resolving Prometheus datasource UID from $BASE ..." >&2
PROM_UID="$(curl -fsS -u "admin:$PASS" "$BASE/api/datasources" \
  | python3 -c "import sys,json; ds=json.load(sys.stdin); print(next((d['uid'] for d in ds if d['type']=='prometheus'), ''))")"
if [[ -z "$PROM_UID" ]]; then
  echo "ERROR: no prometheus datasource found in Grafana" >&2
  exit 1
fi
echo "Using datasource uid: $PROM_UID" >&2

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
sed "s/__PROM_UID__/$PROM_UID/g" "$DASH" > "$TMP"

BODY="$(python3 -c "
import json, sys
dash = json.load(open('$TMP', encoding='utf-8'))
print(json.dumps({'dashboard': dash, 'overwrite': True}))
")"

echo "POSTing dashboard '$DASH' -> $BASE/api/dashboards/db ..." >&2
curl -fsS -u "admin:$PASS" -H 'Content-Type: application/json' \
  -X POST "$BASE/api/dashboards/db" -d "$BODY"
echo
