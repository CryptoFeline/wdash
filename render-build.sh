#!/usr/bin/env bash
# exit on error
set -o errexit

# Navigate to backend directory
cd backend

# Install dependencies (no Chromium download needed for @sparticuz/chromium)
npm install

echo "✅ Build complete - using @sparticuz/chromium (no download needed)"
