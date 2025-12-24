# 🚀 DevTrack - C++23 + Electron Project Management System

> **A concept-driven project management system designed for AI-assisted solo development projects**

[![C++23](https://img.shields.io/badge/C%2B%2B-23-blue.svg)](https://en.cppreference.com/w/cpp/23)
[![Electron](https://img.shields.io/badge/Electron-28%2B-brightgreen.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [Documentation](#-documentation)
3. [Features](#-features)
4. [Architecture](#-architecture)
5. [Technology Stack](#-technology-stack)
6. [Project Status](#-project-status)
7. [Development](#-development)
8. [Building](#-building)
9. [Contributing](#-contributing)

---

## 🚀 Quick Start

### Prerequisites
- **Backend**: CMake 3.20+, C++23 compiler, SQLite3
- **Frontend**: Node.js 18+, npm

### Automated Setup (Linux/macOS)
```bash
./setup.sh
```

### Manual Setup

**Backend:**
```bash
cd backend
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . -j$(nproc)
```

**Frontend:**
```bash
cd frontend
npm install
npm run electron:dev
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[README_NEW.md](README_NEW.md)** | Complete project documentation and overview |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System architecture and visual diagrams |
| **[BUILD_GUIDE.md](BUILD_GUIDE.md)** | Detailed build and setup instructions |
| **[MIGRATION_PLAN.md](MIGRATION_PLAN.md)** | Migration strategy from C# MAUI |
| **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** | Current status and implementation roadmap |

---

## ✨ Features

### ✅ Implemented (Architecture)
- 🏗️ Modern C++23 backend with SQLite database
- 🖥️ Electron desktop app with React + TypeScript
- 📊 Project management with 5W1H concept framework
- 📝 Task tracking with priorities and time tracking
- 🎨 Dark/Light theme support
- 🔄 REST API for frontend-backend communication
- 📦 Cross-platform support (Windows, macOS, Linux)

### 🔜 Coming Soon (Implementation Phase)
- ⏱️ Kanban board view
- 📈 Timeline/Gantt chart
- 🔗 Concept relationship visualization
- 🤖 AI-assisted project analysis
- 📊 Analytics and reporting
- 🔍 Advanced search and filtering
- 📤 Export/Import (JSON, CSV, Markdown)

---

## 🏛️ Architecture

### System Overview

```
┌──────────────────────────────────────┐
│   Electron Desktop Application       │
│  ┌────────────────────────────────┐  │
│  │  React + TypeScript Frontend   │  │
│  │  • Material-UI Components      │  │
│  │  • Redux State Management      │  │
│  │  • React Router Navigation     │  │
│  └────────────────────────────────┘  │
│              ↕ HTTP/WS                │
│  ┌────────────────────────────────┐  │
│  │   C++23 Backend Server         │  │
│  │  • Crow HTTP Server            │  │
│  │  • SQLite Database             │  │
│  │  • Repository Pattern          │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**→ See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams**

### Directory Structure

```
DevTrack/
├── backend/                # C++23 Backend
│   ├── src/               # Source files
│   ├── include/           # Headers
│   ├── external/          # Dependencies
│   └── tests/             # Unit tests
│
├── frontend/              # Electron + React
│   ├── src/
│   │   ├── main/         # Electron main process
│   │   ├── renderer/     # React app
│   │   └── preload/      # IPC bridge
│   └── package.json
│
└── Documentation/         # Guides and docs
```

---

## 🛠️ Technology Stack

### Backend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Language | C++23 | High-performance core |
| Database | SQLite3 | Embedded database |
| HTTP Server | Crow | Lightweight REST API |
| JSON | nlohmann/json | JSON parsing |
| Build | CMake 3.20+ | Build system |
| Testing | Google Test | Unit tests |

### Frontend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Electron 28+ | Desktop wrapper |
| Framework | React 18+ | UI framework |
| Language | TypeScript 5+ | Type safety |
| UI Library | Material-UI | Component library |
| State | Redux Toolkit | State management |
| Build Tool | Vite 5+ | Fast builds |
| Router | React Router 6+ | Navigation |

---

## 📊 Project Status

### Current Phase: **Architecture Complete ✅**

| Phase | Status | Progress |
|-------|--------|----------|
| **Phase 1**: Architecture & Planning | ✅ Complete | 100% |
| **Phase 2**: Backend Implementation | 🔜 Ready | 0% |
| **Phase 3**: Frontend Implementation | 🔜 Ready | 0% |
| **Phase 4**: Advanced Features | ⏳ Pending | 0% |
| **Phase 5**: Testing & Polish | ⏳ Pending | 0% |

### Files Created: **21+ files**
- C++ headers and sources: 11 files
- TypeScript/React files: 7 files
- Configuration files: 5 files
- Documentation: 6 comprehensive guides

**→ See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for detailed status**

---

## 💻 Development

### Backend Development

1. **Build** the backend:
   ```bash
   cd backend/build
   cmake --build . --config Release
   ```

2. **Run** the server:
   ```bash
   ./bin/devtrack_server --port=3001 --db=~/.devtrack/devtrack.db
   ```

3. **Test**:
   ```bash
   ctest --output-on-failure
   ```

### Frontend Development

1. **Start** dev server:
   ```bash
   cd frontend
   npm run electron:dev
   ```
   - Hot reload enabled
   - DevTools open automatically
   - Backend auto-starts

2. **Lint & Format**:
   ```bash
   npm run lint
   npm run format
   ```

---

## 🔨 Building

### Development Build
```bash
# Backend
cd backend && mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug
cmake --build .

# Frontend
cd frontend
npm run dev
```

### Production Build
```bash
# Backend
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release

# Frontend (creates installers)
cd frontend
npm run electron:build

# Output:
# - Linux: DevTrack-1.0.0.AppImage / .deb
# - Windows: DevTrack Setup 1.0.0.exe
# - macOS: DevTrack-1.0.0.dmg
```

**→ See [BUILD_GUIDE.md](BUILD_GUIDE.md) for detailed instructions**

---

## 🎯 Key Concepts

### 5W1H Framework
DevTrack uses a concept-first approach based on the 5W1H framework:

- **What**: Core purpose and objectives
- **How**: Technical implementation strategies  
- **Where**: System architecture and component placement
- **With What**: Tools, technologies, and resources
- **When**: Development phases and evolution
- **Why**: Reasoning and justification for decisions

This framework is integrated into the project data model and UI.

### Design Principles

1. **Separation of Concerns**: Backend and frontend are completely separate
2. **Type Safety**: TypeScript on frontend, strong typing in C++
3. **Performance**: C++ backend for speed, React for rich UI
4. **Modern Standards**: C++23 features, latest React patterns
5. **Cross-Platform**: Single codebase for all major platforms

---

## 📈 Next Steps

### Immediate Priorities

1. ✅ **Architecture** - Complete
2. 🔜 **Repository Implementation** - Implement CRUD operations in C++
3. 🔜 **API Layer** - Create REST endpoints with Crow
4. 🔜 **React Components** - Build UI components
5. 🔜 **State Management** - Set up Redux store
6. 🔜 **Integration** - Connect frontend to backend
7. 🔜 **Testing** - Write unit and integration tests
8. 🔜 **Packaging** - Create installers

**Estimated Timeline**: 6-8 weeks total

---

## 🤝 Contributing

This is a personal project for The No Hands Company, but contributions, suggestions, and feedback are welcome!

### Development Workflow

1. Fork the repository (when public)
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

### Code Style

- **C++**: Follow C++ Core Guidelines, use modern C++23 features
- **TypeScript**: ESLint + Prettier configuration provided
- **Commits**: Use conventional commits format

---

## 📝 API Reference

### REST API Endpoints

**Projects:**
```
GET    /api/projects          # List all projects
GET    /api/projects/:id      # Get project by ID
POST   /api/projects          # Create project
PUT    /api/projects/:id      # Update project
DELETE /api/projects/:id      # Delete project
```

**Tasks:**
```
GET    /api/tasks             # List all tasks
GET    /api/tasks/:id         # Get task by ID
GET    /api/projects/:id/tasks # Get project tasks
POST   /api/tasks             # Create task
PUT    /api/tasks/:id         # Update task
DELETE /api/tasks/:id         # Delete task
```

---

## 🗺️ Roadmap

### Version 1.0 (Current)
- ✅ Project structure and architecture
- 🔜 Core CRUD operations
- 🔜 Basic UI implementation
- 🔜 Dark/Light themes

### Version 1.1 (Planned)
- 🔜 Kanban board view
- 🔜 Timeline visualization
- 🔜 Advanced filtering

### Version 2.0 (Future)
- 🔜 Concept relationship graphs
- 🔜 AI-powered insights
- 🔜 Plugin system
- 🔜 Cloud sync

---

## 📄 License

© 2024 The No Hands Company. All rights reserved.

This is proprietary software for personal use.

---

## 🙏 Acknowledgments

- **C++ Community** - For C++23 standards and libraries
- **Electron Team** - For the awesome desktop framework
- **React Team** - For the powerful UI library
- **Open Source** - For all the amazing tools and libraries

---

## 📞 Contact

**The No Hands Company**
- GitHub: [The-No-Hands-Company](https://github.com/The-No-Hands-Company)
- Project: DevTrack - AI-Assisted Project Management

---

## 🎉 Getting Started

Ready to build DevTrack? Choose your path:

### 🏃 Quick Start
```bash
./setup.sh
```

### 📖 Detailed Setup
Read [BUILD_GUIDE.md](BUILD_GUIDE.md)

### 🧠 Understand the Architecture
Read [ARCHITECTURE.md](ARCHITECTURE.md)

### 🔄 Migration from C#
Read [MIGRATION_PLAN.md](MIGRATION_PLAN.md)

---

<p align="center">
  <strong>DevTrack</strong> - Concept-Driven Project Management<br>
  Built with ❤️ using C++23 and Electron
</p>

<p align="center">
  <sub>Version 1.0.0 | Architecture Phase Complete</sub>
</p>
