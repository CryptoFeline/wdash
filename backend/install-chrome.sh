#!/bin/bash

# Install Chromium for Puppeteer on Render.com
echo "Installing Chromium..."

# Install chromium
apt-get update && apt-get install -y \
  chromium-browser \
  chromium-codecs-ffmpeg

echo "Chromium installed successfully!"
