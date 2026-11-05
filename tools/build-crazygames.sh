#!/bin/sh
# Builds the CrazyGames upload: dist/crazygames/index.html and dist/harvest-rush-crazygames.zip (index.html at the zip root).
cd "$(dirname "$0")/.." || exit 1
rm -rf dist/crazygames dist/harvest-rush-crazygames.zip
mkdir -p dist/crazygames
cp index.html dist/crazygames/index.html
( cd dist/crazygames && zip -q -9 ../harvest-rush-crazygames.zip index.html )
echo "files: $(find dist/crazygames -type f | wc -l | tr -d ' ')"
echo "size:  $(du -h dist/harvest-rush-crazygames.zip | cut -f1) zipped, $(du -h dist/crazygames/index.html | cut -f1) unzipped"
