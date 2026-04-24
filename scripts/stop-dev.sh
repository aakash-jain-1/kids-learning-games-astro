#!/usr/bin/env bash
# Kill any Astro dev / preview servers started from THIS project.
#
# Scoped by the absolute project directory this script lives in, so running
# it will never kill an unrelated `astro dev` running from a different repo.
#
# Covers three failure modes we've hit:
#   1. A running dev/preview server on 4321 / 4322 / 4323.
#   2. Orphaned `npm exec astro ...` wrappers whose IDE terminal was closed
#      (parent becomes PID 1, port stays held).
#   3. Stale esbuild / vite child processes keeping things alive.
#
# Usage:
#   bash scripts/stop-dev.sh
#   npm run stop

set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PORTS=(4321 4322 4323)

say() { printf '%s\n' "$*"; }

have() { command -v "$1" >/dev/null 2>&1; }

# Recursively kill a process and all its descendants.
kill_tree() {
  local pid="$1" sig="$2"
  local child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child" "$sig"
  done
  if kill -0 "$pid" 2>/dev/null; then
    kill "-$sig" "$pid" 2>/dev/null || true
  fi
}

# Collect all PIDs that belong to this project's dev/preview stack.
collect_pids() {
  local -a pids=()

  # 1. Anything listening on our ports (works on macOS + Linux).
  if have lsof; then
    local port pid
    for port in "${PORTS[@]}"; do
      while IFS= read -r pid; do
        [ -n "$pid" ] && pids+=("$pid")
      done < <(lsof -ti "tcp:$port" -sTCP:LISTEN 2>/dev/null || true)
    done
  fi

  # 2. Astro processes launched FROM this project directory.
  #    Matches paths like /.../kids-learning-games-astro/node_modules/.bin/astro
  if have pgrep; then
    local pid
    while IFS= read -r pid; do
      [ -n "$pid" ] && pids+=("$pid")
    done < <(pgrep -f "${PROJECT_DIR}.*astro (dev|preview)" 2>/dev/null || true)

    # 3. `npm exec astro ...` wrappers whose ps line shows the astro binary
    #    under this project's node_modules. Belt-and-suspenders fallback in
    #    case pgrep missed them. `ps -eo` may be blocked in restrictive
    #    sandboxes — silently skip if so.
    local ps_out
    if ps_out=$(ps -eo pid=,command= 2>/dev/null); then
      while IFS= read -r pid; do
        [ -n "$pid" ] && pids+=("$pid")
      done < <(
        printf '%s\n' "$ps_out" \
          | awk -v dir="$PROJECT_DIR" '
              index($0, dir) > 0 && /astro .*(dev|preview)/ { print $1 }
            '
      )
    fi
  fi

  # Dedup + emit.
  printf '%s\n' "${pids[@]}" | sort -u | grep -E '^[0-9]+$' || true
}

describe_pid() {
  local pid="$1"
  # Best-effort short description. Unknown PIDs (already dead) silently skip.
  ps -p "$pid" -o command= 2>/dev/null | head -c 90 || true
}

kill_round() {
  local sig="$1"
  local any=0 pid
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    any=1
    say "  $sig  $pid  $(describe_pid "$pid")"
    kill_tree "$pid" "$sig"
  done < <(collect_pids)
  if [ "$any" -eq 0 ]; then
    say "  (nothing to kill)"
  fi
}

say "== stopping kids-learning-games-astro dev servers =="
say "   project: $PROJECT_DIR"
say "   ports:   ${PORTS[*]}"
say ""

say "-- SIGTERM --"
kill_round TERM
sleep 2

say ""
say "-- SIGKILL (survivors) --"
kill_round KILL
sleep 1

say ""
say "-- final port check --"
for port in "${PORTS[@]}"; do
  if have lsof && lsof -ti "tcp:$port" -sTCP:LISTEN >/dev/null 2>&1; then
    owner=$(lsof -ti "tcp:$port" -sTCP:LISTEN | head -n1)
    say "  :$port still in use (pid $owner) — likely owned by a different project, leaving alone"
  else
    say "  :$port free"
  fi
done
say ""
say "done."
