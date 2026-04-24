#!/usr/bin/env bash
# Fresh dev server: kill anything lingering from this project, then start
# `astro dev` on a known host/port with telemetry disabled.
#
# Any extra arguments are forwarded to astro, e.g.:
#   bash scripts/dev.sh --port 4325
#   npm run dev:fresh -- --open

set -euo pipefail

HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$HERE/.." && pwd)"

bash "$HERE/stop-dev.sh"

echo ""
echo "== starting fresh dev server (http://127.0.0.1:4321/kids-learning-games/) =="
cd "$PROJECT_DIR"

# Run astro directly from node_modules so we bypass any npx version-resolution
# hiccups and don't re-download packages.
exec env ASTRO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 \
  ./node_modules/.bin/astro dev \
  --host 127.0.0.1 \
  --port 4321 \
  "$@"
