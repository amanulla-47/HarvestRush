#!/bin/sh
# Renders the premium key-art covers (local server on :8767, Google Chrome, Node 22+).
# Output: dist/covers/premium-landscape-1920x1080.png, premium-portrait-800x1200.png, premium-square-800x800.png
cd "$(dirname "$0")/.." || exit 1
mkdir -p dist/covers
for spec in ${SIZES:-landscape:1920:1080 portrait:800:1200 square:800:800}; do
  name=${spec%%:*}; rest=${spec#*:}; w=${rest%%:*}; h=${rest#*:}
  node tools/shoot.mjs "http://127.0.0.1:8767/?debug&cover&keyart" $w $h "$PWD/dist/covers/premium-$name-${w}x$h.png" "window.__kaReady"
done
