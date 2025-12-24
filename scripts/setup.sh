#!/bin/bash
# DevTrack Development Environment Setup

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         DevTrack Development Environment Setup            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running in project root
cd "$PROJECT_ROOT"

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check CMake
if command -v cmake &> /dev/null; then
    CMAKE_VERSION=$(cmake --version | head -n1)
    echo -e "${GREEN}✓${NC} CMake: $CMAKE_VERSION"
else
    echo -e "${RED}✗${NC} CMake not found. Please install CMake 3.20+"
    echo "  Ubuntu/Debian: sudo apt-get install cmake"
    echo "  macOS: brew install cmake"
    exit 1
fi

# Check C++ compiler
if command -v g++ &> /dev/null; then
    GCC_VERSION=$(g++ --version | head -n1)
    echo -e "${GREEN}✓${NC} G++: $GCC_VERSION"
elif command -v clang++ &> /dev/null; then
    CLANG_VERSION=$(clang++ --version | head -n1)
    echo -e "${GREEN}✓${NC} Clang++: $CLANG_VERSION"
else
    echo -e "${RED}✗${NC} C++ compiler not found"
    exit 1
fi

# Check SQLite
if pkg-config --exists sqlite3 2>/dev/null; then
    SQLITE_VERSION=$(pkg-config --modversion sqlite3)
    echo -e "${GREEN}✓${NC} SQLite3: $SQLITE_VERSION"
else
    echo -e "${YELLOW}⚠${NC} SQLite3 development libraries not found"
    echo "  Ubuntu/Debian: sudo apt-get install libsqlite3-dev"
    echo "  macOS: brew install sqlite3"
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 18+"
    echo "  Visit: https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm: v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build Backend
echo "🔨 Building C++ Backend..."
echo ""

cd backend

if [ -d "build" ]; then
    echo "Cleaning previous build..."
    rm -rf build
fi

mkdir build
cd build

echo "Running CMake..."
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_STANDARD=23

echo "Compiling..."
cmake --build . --config Release -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

if [ -f "bin/devtrack_server" ]; then
    echo -e "${GREEN}✓${NC} Backend built successfully!"
else
    echo -e "${RED}✗${NC} Backend build failed"
    exit 1
fi

cd ../..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Setup Frontend
echo "📦 Setting up Frontend..."
echo ""

cd frontend

echo "Installing npm packages..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Frontend dependencies installed!"
else
    echo -e "${RED}✗${NC} Frontend setup failed"
    exit 1
fi

cd ..

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✅ Setup Complete!                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "To run DevTrack:"
echo ""
echo "  Option 1 - Integrated (recommended):"
echo "    cd frontend"
echo "    npm run electron:dev"
echo ""
echo "  Option 2 - Separate processes:"
echo "    Terminal 1: cd backend/build/bin && ./devtrack_server"
echo "    Terminal 2: cd frontend && npm run dev"
echo ""
echo "To build for production:"
echo "  cd frontend"
echo "  npm run electron:build"
echo ""
echo "Documentation:"
echo "  - README_NEW.md     - Project overview"
echo "  - BUILD_GUIDE.md    - Detailed build instructions"
echo "  - MIGRATION_PLAN.md - Migration strategy"
echo "  - PROJECT_SUMMARY.md - Current status"
echo ""
echo "Happy coding! 🚀"
echo ""
