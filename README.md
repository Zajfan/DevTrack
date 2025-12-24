# DevTrack

[![C++23](https://img.shields.io/badge/C%2B%2B-23-blue.svg)](https://en.cppreference.com/w/cpp/23)
[![Electron](https://img.shields.io/badge/Electron-28%2B-brightgreen.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

> A high-performance, concept-driven project management system for AI-assisted solo development projects.

## Overview

DevTrack is a modern desktop application combining a C++23 backend with an Electron frontend, designed specifically for managing AI-assisted development projects using the 5W1H conceptual framework.

## Features

- 🏗️ **Modern C++23 Backend** - High-performance server with SQLite database
- 🖥️ **Electron Desktop UI** - Rich, responsive interface built with React + TypeScript
- 📊 **Concept-First Approach** - 5W1H framework (What, How, Where, With What, When, Why)
- 📝 **Project Management** - Track projects, tasks, and concepts
- 🎨 **Modern UI** - Material-UI components with dark/light themes
- 🔄 **Real-time Updates** - WebSocket support for live data
- 📦 **Cross-Platform** - Windows, macOS, and Linux support

## Quick Start

```bash
# Clone the repository
git clone https://github.com/The-No-Hands-Company/DevTrack.git
cd DevTrack

# Run automated setup (Linux/macOS)
./scripts/setup.sh

# Or build manually
cd backend && mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .

cd ../../frontend
npm install
npm run electron:dev
```

## Documentation

- 📖 [Full Documentation](docs/INDEX.md)
- 🏛️ [Architecture Overview](docs/ARCHITECTURE.md)
- 🔨 [Build Guide](docs/BUILD_GUIDE.md)
- 🔄 [Migration Plan](docs/MIGRATION_PLAN.md)

## Technology Stack

### Backend
- **C++23** - Modern C++ with latest features
- **SQLite3** - Embedded database
- **Crow** - Lightweight HTTP server
- **CMake** - Build system

### Frontend
- **Electron** - Desktop application framework
- **React 18** - UI library
- **TypeScript 5** - Type-safe development
- **Material-UI** - Component library
- **Redux Toolkit** - State management
- **Vite** - Build tool

## Project Structure

```
DevTrack/
├── backend/           # C++23 server
│   ├── src/          # Source files
│   ├── include/      # Header files
│   └── tests/        # Unit tests
├── frontend/         # Electron app
│   └── src/          # TypeScript/React code
├── docs/             # Documentation
├── scripts/          # Build scripts
└── tools/            # Development tools
```

## Development Status

**Current Phase**: Architecture Complete ✅

- ✅ Architecture design
- ✅ Project structure
- ✅ Database schema
- ✅ API design
- 🔜 Backend implementation
- 🔜 Frontend implementation
- 🔜 Testing & deployment

See [PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md) for detailed status.

## Requirements

### Backend
- CMake 3.20+
- C++23 compatible compiler (GCC 12+, Clang 16+, MSVC 2022+)
- SQLite3 development libraries

### Frontend
- Node.js 18+
- npm or pnpm

## Building

### Backend
```bash
cd backend
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_STANDARD=23
cmake --build . -j$(nproc)
./bin/devtrack_server
```

### Frontend
```bash
cd frontend
npm install
npm run electron:dev  # Development
npm run electron:build  # Production
```

## Contributing

This is a personal project for The No Hands Company. Contributions, suggestions, and feedback are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

© 2024 The No Hands Company. All rights reserved.

This is proprietary software. See [LICENSE](LICENSE) for details.

## Contact

- **Organization**: The No Hands Company
- **Project**: DevTrack
- **GitHub**: [The-No-Hands-Company](https://github.com/The-No-Hands-Company)

## Acknowledgments

Built with modern tools and frameworks:
- C++ Standard Committee for C++23
- Electron Team
- React Team
- The open source community

---

**DevTrack** - Empowering AI-Assisted Development
