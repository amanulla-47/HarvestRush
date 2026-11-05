#!/bin/sh
# Renders the three CrazyGames cover images from the live game (needs the local server on :8767).
# Output: dist/covers/cover-square-800x800.png (the landscape and portrait covers are the trailer's first frames)
cd "$(dirname "$0")/.." || exit 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL="http://127.0.0.1:8767/?debug&cover"
mkdir -p dist/covers
for spec in ${COVERS:-square:800:800}; do   # landscape + portrait come from the video first frames (tools/trailer.mjs); COVERS="landscape:1920:1080 portrait:800:1200 square:800:800" renders all three here
  name=${spec%%:*}; rest=${spec#*:}; w=${rest%%:*}; h=${rest#*:}
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=$w,$h --timeout=12000 --user-data-dir="$(mktemp -d)" \
    --screenshot="$PWD/dist/covers/cover-$name-${w}x$h.png" "$URL" >/dev/null 2>&1
  echo "dist/covers/cover-$name-${w}x$h.png"
done
