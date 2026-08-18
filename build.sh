#!/usr/bin/env bash
# Build the Sueños CRM: assemble the single-file app, then stage only the
# static app shell into dist/ for Netlify to publish.
set -euo pipefail

echo "→ Assembling index.html from source parts…"
python3 assemble_cloud.py

echo "→ Staging dist/…"
rm -rf dist
mkdir -p dist
cp index.html sw.js manifest.json \
   apple-touch-icon.png icon-192.png icon-512.png icon-maskable-512.png \
   dist/

echo "✓ Build complete. Published files:"
ls -1 dist/
