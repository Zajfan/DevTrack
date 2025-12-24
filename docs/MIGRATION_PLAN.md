# DevTrack Migration Plan: C# MAUI → C++23 + Electron

## Overview
Migrating DevTrack from C# MAUI to a modern C++23 backend with Electron desktop UI.

## Architecture

### Backend: C++23 Core
- **Language**: C++ Standard 23
- **Database**: SQLite3 with modern C++ wrapper
- **API Layer**: RESTful HTTP server (using Crow or similar)
- **Build System**: CMake 3.20+
- **Features**:
  - Project management engine
  - Task tracking system
  - Concept mapping system
  - Data persistence layer
  - WebSocket support for real-time updates

### Frontend: Electron Desktop
- **Framework**: Electron (Chromium + Node.js)
- **UI Library**: React with TypeScript
- **State Management**: Redux Toolkit or Zustand
- **Styling**: Tailwind CSS or Material-UI
- **IPC**: Electron IPC for backend communication
- **Features**:
  - Multiple layout views (Kanban, Timeline, Grid, Calendar)
  - Drag-and-drop interface
  - Customizable dashboards
  - Dark/Light themes
  - Real-time updates

### Communication Layer
- **Local HTTP API**: Backend exposes REST endpoints on localhost
- **WebSocket**: For real-time project updates
- **Electron IPC**: For native OS integration

## Project Structure

```
DevTrack/
├── backend/                    # C++23 Backend
│   ├── src/
│   │   ├── core/              # Core application logic
│   │   ├── models/            # Data models
│   │   ├── services/          # Business logic services
│   │   ├── database/          # Database layer
│   │   ├── api/               # REST API endpoints
│   │   └── utils/             # Utilities
│   ├── include/               # Public headers
│   ├── tests/                 # Unit tests
│   └── CMakeLists.txt
│
├── frontend/                   # Electron Frontend
│   ├── src/
│   │   ├── main/              # Electron main process
│   │   ├── renderer/          # React app
│   │   │   ├── components/   # React components
│   │   │   ├── views/        # Page views
│   │   │   ├── layouts/      # Layout components
│   │   │   ├── store/        # State management
│   │   │   └── services/     # API client
│   │   └── preload/          # Preload scripts
│   ├── public/
│   └── package.json
│
├── shared/                     # Shared types/interfaces
│   └── api/                   # API contracts
│
└── docs/                       # Documentation
```

## Migration Steps

### Phase 1: Backend Setup
1. ✅ Create C++23 project structure
2. ✅ Set up CMake build system
3. ✅ Implement data models
4. ✅ Create database layer with SQLite
5. ✅ Implement service layer
6. ✅ Build REST API server
7. ✅ Add WebSocket support
8. ✅ Write unit tests

### Phase 2: Frontend Setup
1. ✅ Initialize Electron + React project
2. ✅ Set up TypeScript configuration
3. ✅ Create base UI components
4. ✅ Implement API client
5. ✅ Set up state management
6. ✅ Create layout system

### Phase 3: Feature Migration
1. ✅ Project CRUD operations
2. ✅ Task management
3. ✅ Concept mapping system
4. ✅ Multiple layout views
5. ✅ User preferences
6. ✅ Search and filtering
7. ✅ Export/Import functionality

### Phase 4: Integration & Testing
1. ✅ End-to-end integration
2. ✅ Performance testing
3. ✅ UI/UX refinement
4. ✅ Documentation
5. ✅ Deployment packaging

## Technology Stack

### Backend
- **C++ Standard**: C++23
- **HTTP Server**: Crow (header-only)
- **Database**: SQLite3 + SQLiteCpp wrapper
- **JSON**: nlohmann/json
- **Testing**: Google Test
- **Build**: CMake + Ninja

### Frontend
- **Runtime**: Electron 28+
- **Framework**: React 18+
- **Language**: TypeScript 5+
- **UI Components**: Material-UI or shadcn/ui
- **Build Tool**: Vite
- **Package Manager**: npm/pnpm

## Key Features to Implement

### Core Features
- [x] Project creation, editing, deletion
- [x] Task management with status tracking
- [x] Concept-first approach (What, How, Where, With What, When, Why)
- [x] Multiple project views
- [x] Real-time updates
- [x] Search and filtering
- [x] Data export/import

### Advanced Features
- [ ] Concept relationship mapping
- [ ] Visual concept explorer
- [ ] AI-assisted analysis
- [ ] Timeline/Gantt view
- [ ] Kanban board
- [ ] Calendar integration
- [ ] Tag system
- [ ] Custom fields
- [ ] Reporting and analytics
- [ ] Theme customization

## Database Schema

### Projects Table
```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    status TEXT CHECK(status IN ('Active', 'OnHold', 'Completed', 'Archived')),
    concept_what TEXT,
    concept_how TEXT,
    concept_where TEXT,
    concept_with_what TEXT,
    concept_when TEXT,
    concept_why TEXT
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    status TEXT CHECK(status IN ('ToDo', 'InProgress', 'UnderReview', 'Blocked', 'Completed')),
    priority TEXT CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')),
    assigned_to TEXT,
    estimated_hours REAL DEFAULT 0,
    actual_hours REAL DEFAULT 0,
    is_completed BOOLEAN DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

## Benefits of New Architecture

1. **Performance**: C++ backend for high-performance data processing
2. **Modern UI**: Electron enables rich, modern desktop experience
3. **Cross-Platform**: Works on Windows, macOS, Linux
4. **Flexibility**: Easy to customize and extend
5. **Web Technologies**: Leverage React ecosystem
6. **Separation of Concerns**: Clean backend/frontend separation
7. **Scalability**: Can evolve to client-server if needed

## Timeline Estimate
- Phase 1 (Backend): 2-3 weeks
- Phase 2 (Frontend): 2-3 weeks
- Phase 3 (Migration): 1-2 weeks
- Phase 4 (Testing): 1 week
- **Total**: 6-9 weeks

## Next Steps
1. Set up development environment
2. Create backend project structure
3. Implement core data models
4. Build REST API
5. Create Electron app scaffold
6. Implement UI components
7. Integrate backend and frontend
8. Migrate existing data
9. Test and refine
10. Package and deploy
