#!/usr/bin/env bash
# Gate → push → deploy → wait → health. Run from the repo root of a linked project.
# Env: HEALTH_URL (e.g. https://app.up.railway.app/up), SKIP_TESTS=1 to bypass the gate (don't).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

gate() {
  local ran=0
  for dir in server backend .; do
    [ -f "$dir/Gemfile" ] && { echo "→ rspec ($dir)"; (cd "$dir" && bundle exec rspec) ; ran=1; break; }
  done
  for dir in web frontend .; do
    [ -f "$dir/package.json" ] && { echo "→ build ($dir)"; (cd "$dir" && npm run build); ran=1; break; }
  done
  [ "$ran" = 1 ] || echo "(no test/build gate found — continuing)"
}

[ "${SKIP_TESTS:-0}" = 1 ] || gate

if [ -n "$(git status --porcelain)" ]; then
  echo "Uncommitted changes — commit first (deploys should be reproducible)."; exit 1
fi
git push -q
OUT=$(railway up --detach 2>&1); echo "$OUT" | tail -1
ID=$(echo "$OUT" | grep -oP 'id=\K[a-f0-9]{8}' | head -1 || true)
"$HERE/wait-for-deploy.sh" "${ID:-}" "${HEALTH_URL:-}"
