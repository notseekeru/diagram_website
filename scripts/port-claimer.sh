#!/usr/bin/env bash
# port-claimer.sh — detect port conflicts, free them by stopping the
#                   offending docker compose project.
#
# Usage: port-claimer.sh [--self <project>] <port> [port...]
#
#   --self <project>   Project name of the caller (e.g. "auth-dev").
#                      Ports held by this project are treated as "self-owned"
#                      and left alone rather than freed.
#
# For each port:
#   1. Check if port is taken (ss -tlnp)
#   2. Find container via docker ps --filter publish=PORT
#   3. Extract compose project metadata from container labels
#   4. If --self was given and the container belongs to that project, skip
#   5. Otherwise run `docker compose -p <project> -f <config_files> down`
#      in the compose project's working directory
#   6. Wait up to 10s for the port to be released
#
# Exit: 0 if all ports free (or freed), 1 if any still blocked.

set -euo pipefail

# ── helpers ──────────────────────────────────────────────────────────
die() { echo "[port-claimer] ERROR: $*" >&2; exit 1; }
info() { echo "[port-claimer] $*"; }
warn() { echo "[port-claimer] WARN: $*" >&2; }

# ── dependency check ─────────────────────────────────────────────────
for cmd in docker ss; do
    command -v "$cmd" >/dev/null 2>&1 || die "required command not found: $cmd"
done

# ── port helpers ─────────────────────────────────────────────────────
port_in_use() {
    local port="$1"
    ss -tlnp "sport = :$port" 2>/dev/null | grep -q LISTEN
}

container_by_port() {
    local port="$1"
    docker ps --filter "publish=$port" --format '{{.ID}}' 2>/dev/null | head -1
}

compose_label() {
    local cid="$1" label="$2"
    local val
    val=$(docker inspect "$cid" --format "{{index .Config.Labels \"$label\"}}" 2>/dev/null) || true
    if [[ "$val" == "<no value>" ]]; then
        echo ""
    else
        echo "$val"
    fi
}

# ── parse args ───────────────────────────────────────────────────────
SELF_PROJECT=""
ARGS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --self)
            shift
            [[ $# -eq 0 ]] && die "--self requires a project name argument"
            SELF_PROJECT="$1"
            shift
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

set -- "${ARGS[@]}"
[[ $# -eq 0 ]] && die "Usage: port-claimer.sh [--self <project>] <port> [port...]"

# ── main ─────────────────────────────────────────────────────────────
BLOCKED_PORTS=()
OWNED_PORTS=()

for PORT in "$@"; do
    [[ "$PORT" =~ ^[0-9]+$ ]] || die "invalid port: $PORT"

    if ! port_in_use "$PORT"; then
        continue
    fi

    info "Port $PORT is already in use."

    CID=$(container_by_port "$PORT")
    if [[ -z "$CID" ]]; then
        warn "Port $PORT is taken by a non-container process — cannot auto-free. Skipping."
        BLOCKED_PORTS+=("$PORT")
        continue
    fi

    WORKDIR=$(compose_label "$CID" "com.docker.compose.project.working_dir")
    if [[ -z "$WORKDIR" ]]; then
        warn "Container $CID does not appear to be a docker compose project — skipping."
        BLOCKED_PORTS+=("$PORT")
        continue
    fi

    if [[ ! -d "$WORKDIR" ]]; then
        warn "Working directory '$WORKDIR' no longer exists — skipping."
        BLOCKED_PORTS+=("$PORT")
        continue
    fi

    PROJECT=$(compose_label "$CID" "com.docker.compose.project")

    # Skip if this port belongs to our own project
    if [[ -n "$SELF_PROJECT" && "$PROJECT" == "$SELF_PROJECT" ]]; then
        info "→ Port $PORT is held by the current project ($PROJECT) — already running, nothing to free."
        OWNED_PORTS+=("$PORT")
        continue
    fi

    CONFIG_FILES=$(compose_label "$CID" "com.docker.compose.project.config_files")

    info "→ Held by compose project '$PROJECT' ($WORKDIR)"

    # Rebuild the exact compose command that started this container
    COMPOSE_CMD=(docker compose -p "$PROJECT")
    if [[ -n "$CONFIG_FILES" ]]; then
        IFS=',' read -ra FILES <<< "$CONFIG_FILES"
        for f in "${FILES[@]}"; do
            COMPOSE_CMD+=(-f "$f")
        done
    fi
    COMPOSE_CMD+=(down)

    info "→ Running: ${COMPOSE_CMD[*]}"
    if ! (cd "$WORKDIR" && "${COMPOSE_CMD[@]}"); then
        warn "'docker compose down' for project '$PROJECT' exited non-zero."
    fi

    # Wait up to 10 s for the port to be released
    for i in $(seq 1 10); do
        if ! port_in_use "$PORT"; then
            info "→ Port $PORT released."
            break
        fi
        sleep 1
    done

    if port_in_use "$PORT"; then
        warn "Port $PORT is still in use after stopping project '$PROJECT'."
        BLOCKED_PORTS+=("$PORT")
    fi
done

# ── final verification ───────────────────────────────────────────────
ALL_FREE=true
for PORT in "$@"; do
    if port_in_use "$PORT"; then
        # Skip ports we intentionally own (self-project is already running)
        OWNED=false
        for o in "${OWNED_PORTS[@]}"; do
            [[ "$o" == "$PORT" ]] && OWNED=true && break
        done
        if $OWNED; then
            continue
        fi
        # Check if this port was previously blocked (non-compose, unfreeable)
        BLOCKED=false
        for b in "${BLOCKED_PORTS[@]}"; do
            [[ "$b" == "$PORT" ]] && BLOCKED=true && break
        done
        if $BLOCKED; then
            warn "Port $PORT is still in use (previously flagged as un-freeable)."
        else
            warn "Port $PORT is still in use (was freed but re-acquired?)."
        fi
        ALL_FREE=false
    fi
done

$ALL_FREE
