#!/usr/bin/env bash
# exit on error
set -o errexit
set -x  # Print each command (verbose)

echo "📦 Starting build process at $(date)..."

# Navigate to backend directory
cd backend
echo "📁 Working directory: $(pwd)"

# Set Puppeteer cache directory for persistence between deploys
export PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer
echo "🗂️  Puppeteer cache directory: $PUPPETEER_CACHE_DIR"

# Check if Chromium is already cached
if [ -d "$PUPPETEER_CACHE_DIR" ]; then
  echo "✅ Found cached Chromium (size: $(du -sh $PUPPETEER_CACHE_DIR 2>/dev/null | cut -f1 || echo 'unknown'))"
  ls -lah "$PUPPETEER_CACHE_DIR" || true
else
  echo "⏬ No cache found - Chromium will be downloaded (~300MB, may take 10-30 minutes)"
fi

# Install dependencies with verbose output
echo "⬇️  Installing dependencies..."
npm install --verbose

echo "✅ Build complete - using full Puppeteer with bundled Chromium"
echo "📊 Installed packages:"
npm list --depth=0

# Show final cache state
if [ -d "$PUPPETEER_CACHE_DIR" ]; then
  echo "📦 Final cache contents:"
  ls -lah "$PUPPETEER_CACHE_DIR" || true
fi

echo "🏁 Build finished at $(date)"
