#!/usr/bin/env bash
# Screenshots aller Seiten aus docs/sitemap.xml bei 390x844 und 1440x900
# nach tools/cache/screens/ (wird nicht committet, siehe .gitignore).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=4173
BASIS_URL="https://justolgay.github.io/speuzer-website-prototyp"
ZIEL="tools/cache/screens"

mkdir -p "$ZIEL"

node tools/server.mjs &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

# Warten, bis der Server antwortet
for i in $(seq 1 50); do
  if curl -s -o /dev/null "http://localhost:${PORT}/"; then
    break
  fi
  sleep 0.1
done

# Pfade aus der Sitemap lesen
PFADE=$(grep -o '<loc>[^<]*</loc>' docs/sitemap.xml | sed -e 's/<loc>//' -e 's#</loc>##' -e "s#${BASIS_URL}##")

for PFAD in $PFADE; do
  if [ -z "$PFAD" ]; then PFAD="/"; fi
  SLUG=$(echo "$PFAD" | sed -e 's#^/##' -e 's#/$##' -e 's#/#-#g')
  if [ -z "$SLUG" ]; then SLUG="start"; fi

  echo "Screenshot: $PFAD -> $SLUG"

  "$CHROME" --headless --disable-gpu \
    --screenshot="${ZIEL}/${SLUG}-390x844.png" \
    --window-size=390,844 \
    "http://localhost:${PORT}${PFAD}" 2>/dev/null

  "$CHROME" --headless --disable-gpu \
    --screenshot="${ZIEL}/${SLUG}-1440x900.png" \
    --window-size=1440,900 \
    "http://localhost:${PORT}${PFAD}" 2>/dev/null
done

echo "Fertig. Screenshots liegen in ${ZIEL}/"
