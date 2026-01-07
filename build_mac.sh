#!/bin/bash

# Mac Build Script for Project Scoring Pro

echo "Starting Mac Build Process..."

# 1. Install dependencies (if not already done)
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# 2. Run the build
echo "Building application..."
npm run electron:build:mac

# 3. Check result
if [ -d "release-app-v3" ]; then
    echo "Build Complete!"
    echo "You can find the .dmg file in the 'release-app-v3' folder."
    open release-app-v3
else
    echo "Build failed. Please check the errors above."
fi
