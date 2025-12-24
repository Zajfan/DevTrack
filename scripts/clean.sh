#!/bin/bash
# Clean build artifacts

echo "🧹 Cleaning build artifacts..."

# Backend
if [ -d "backend/build" ]; then
    rm -rf backend/build
    echo "✓ Removed backend/build"
fi

# Frontend
if [ -d "frontend/node_modules" ]; then
    rm -rf frontend/node_modules
    echo "✓ Removed frontend/node_modules"
fi

if [ -d "frontend/dist" ]; then
    rm -rf frontend/dist
    echo "✓ Removed frontend/dist"
fi

if [ -d "frontend/release" ]; then
    rm -rf frontend/release
    echo "✓ Removed frontend/release"
fi

# Logs
if [ -d "logs" ]; then
    rm -rf logs
    echo "✓ Removed logs"
fi

echo ""
echo "✅ Clean complete!"
