#!/bin/sh
set -eu
# Builds the CrazyGames upload with index.html at the zip root and local painted assets.
cd "$(dirname "$0")/.." || exit 1
node tools/build-three.mjs
rm -rf dist/crazygames dist/harvest-rush-crazygames.zip
mkdir -p dist/crazygames
cp index.html dist/crazygames/index.html
mkdir -p dist/crazygames/assets
cp assets/farm-painted-v1.webp dist/crazygames/assets/
cp assets/crops-painted-v2.webp assets/props-painted-v1.webp assets/terrain-painted-v1.webp dist/crazygames/assets/
cp assets/harvest-three.js dist/crazygames/assets/
mkdir -p dist/crazygames/assets/fonts
cp assets/fonts/*.woff2 assets/fonts/*-OFL.txt dist/crazygames/assets/fonts/
mkdir -p dist/crazygames/assets/vendor
cp assets/vendor/three-LICENSE.txt dist/crazygames/assets/vendor/
# stamp the build (shown in the hidden readout) so a phone running an old cached copy is easy to spot
STAMP=$(date '+%Y-%m-%d %H:%M')
sed -i.bak "s/const BUILD = 'dev';/const BUILD = '$STAMP';/" dist/crazygames/index.html && rm -f dist/crazygames/index.html.bak
grep -q "const BUILD = '$STAMP';" dist/crazygames/index.html || { echo 'build stamp failed'; exit 1; }
echo "build: $STAMP"
( cd dist/crazygames && zip -q -9 -r ../harvest-rush-crazygames.zip index.html assets )
echo "files: $(find dist/crazygames -type f | wc -l | tr -d ' ')"
echo "size:  $(du -h dist/harvest-rush-crazygames.zip | cut -f1) zipped, $(du -sh dist/crazygames | cut -f1) unzipped"

# Fail the release build if Basic Launch packaging or platform safeguards regress.
node tools/check-launch.mjs
node tools/check-compressed-assets.mjs --package
