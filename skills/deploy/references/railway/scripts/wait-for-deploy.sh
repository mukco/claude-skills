#!/usr/bin/env bash
# Wait for a Railway deployment to finish, then hit the health URL.
# Usage: wait-for-deploy.sh [deployment-id-prefix] [health-url]
set -uo pipefail
WANT="${1:-}"; HEALTH="${2:-}"
for _ in $(seq 1 90); do
  ROW=$(railway deployment list 2>/dev/null | sed -n 2p)
  ID=$(echo "$ROW" | grep -oP '^\s*\K[a-f0-9]{8}')
  if echo "$ROW" | grep -qE 'SUCCESS|FAILED|CRASHED'; then
    if [ -z "$WANT" ] || [ "$ID" = "$WANT" ]; then break; fi
  fi
  sleep 10
done
echo "$ROW"
echo "$ROW" | grep -q SUCCESS || { echo "deploy did not succeed"; railway logs -b 2>/dev/null | tail -40; exit 1; }
if [ -n "$HEALTH" ]; then
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH")
  echo "health $HEALTH → $CODE"; [ "$CODE" = "200" ]
fi
