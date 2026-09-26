# DevTrack AI Coding Instructions

## Project Overview
DevTrack is a **native desktop application** built with **Electron + TypeScript + React**. It's designed for AI-assisted solo development projects using a concept-driven 5W1H framework (What, How, Where, With What, When, Why). The architecture follows VS Code's approach: pure TypeScript with no HTTP server or separate backend process.

## Architecture Overview

### Single-Process Native Desktop App
- **Main Process** (Node.js): Database operations with better-sqlite3, IPC handlers, window management
- **Renderer Process** (Chromium): React UI with Material-UI components
- **Preload Bridge**: Type-safe IPC communication between main and renderer
- **Communication**: Direct IPC calls (no HTTP/WebSocket)
- **Database**: SQLite with better-sqlite3 (C++ performance, TypeScript interface)
- **Bundling**: esbuild for React (fast, no dev server needed)

### Key Directories
- `src/main/` - Main process (Node.js runtime)
  - `database/Database.ts` - SQLite database manager (better-sqlite3)
  - `models/` - TypeScript interfaces (Project, Task, Comment, Label, Attachment, CustomField)
  - `repositories/` - Database repositories with CRUD operations
  - `utils/` - Helper utilities (seed data, etc.)
  - `main.ts` - Entry point (initializes database, registers IPC handlers, creates window)
- `src/preload/` - Preload script for secure IPC bridge
  - `preload.ts` - Exposes `window.electronAPI` with TypeScript types
- `src/renderer/` - Renderer process (React UI)
  - `components/` - Reusable UI components
  - `views/` - Page-level components (Dashboard, Projects, Tasks, Settings)
  - `services/api.ts` - IPC client for database operations
  - `types/` - Type definitions
  - `main.tsx` - React entry point
- `dist/` - Build output (TypeScript compiled to CommonJS + esbuild React bundle)
- `scripts/` - Build scripts (build-renderer.js with esbuild configuration)

## Build & Development Workflow

### Development Build
```bash
npm run dev
# Runs: npm run build && NODE_ENV=development electron . --inspect=5858
# 1. Compiles TypeScript (main + preload) to CommonJS
# 2. Bundles React with esbuild (browser-compatible)
# 3. Launches Electron with DevTools
```

### Production Build
```bash
npm run build
# Runs: build:main + build:renderer + copy:assets
# 1. tsc - Compiles src/ to dist/
# 2. node scripts/build-renderer.js - esbuild bundles React
# 3. cp - Copies index.html and styles to dist/renderer/
```

### Package for Distribution
```bash
npm run package
# Uses electron-builder to create installers
```

## Code Conventions

### TypeScript (All Code)
- **Strict TypeScript**: Use strict mode, explicit types, no `any`
- **Interfaces**: Define data models in `src/main/models/` (Project, Task, Comment, etc.)
- **Enums**: Use TypeScript enums for status types (ProjectStatus, TaskStatus, TaskPriority)
- **Async/Await**: Use async/await for all async operations, avoid callbacks
- **Error Handling**: Use try/catch with proper error messages

Example pattern from `src/main/models/Project.ts`:
```typescript
export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  conceptWhat: string | null;
  conceptHow: string | null;
  // ... other 5W1H fields
}

export enum ProjectStatus {
  Active = 'active',
  OnHold = 'on_hold',
  Completed = 'completed',
  Archived = 'archived'
}
```

### TypeScript Repositories
- **Pattern**: Class-based repositories with Database instance injected via constructor
- **CRUD**: create, findById, findAll, update, delete as minimum methods
- **SQL**: Use better-sqlite3 prepared statements for all queries
- **Mapping**: Snake_case (database) → camelCase (TypeScript) in mappers

Example from `src/main/repositories/ProjectRepository.ts`:
```typescript
export class ProjectRepository {
  constructor(private db: Database.Database) {}
  
  create(data: CreateProjectData): Project {
    const stmt = this.db.prepare(`INSERT INTO projects...`);
    const result = stmt.run(data);
    return this.findById(result.lastInsertRowid as number)!;
  }
  
  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      conceptWhat: row.concept_what, // snake_case → camelCase
      // ...
    };
  }
}
```

### React Components
- **Types**: Import from `../types` (re-exports from main models)
- **API Calls**: Use `window.electronAPI` exposed by preload script
- **State**: Use React hooks (useState, useEffect) for local state
- **Material-UI**: Use Material-UI components with consistent theming

### 5W1H Concept Framework
Projects have six concept fields that MUST be preserved:
- `concept_what` / `conceptWhat` - What is being built
- `concept_how` / `conceptHow` - Implementation approach
- `concept_where` / `conceptWhere` - Deployment/location
- `concept_with_what` / `conceptWithWhat` - Tools/technologies
- `concept_when` / `conceptWhen` - Timeline/schedule
- `concept_why` / `conceptWhy` - Purpose/justification

**Never remove or rename these fields** - they're core to the project's conceptual approach.

## Database Layer

### SQLite Schema
- `projects` table with 5W1H concept fields
- `tasks` table with `project_id` foreign key (CASCADE on delete)
- `comments`, `labels`, `task_labels`, `attachments`, `custom_fields`, `task_custom_values` tables
- 4 indexes: idx_tasks_project_id, idx_comments_task_id, idx_attachments_task_id, idx_labels_project_id

### Repository Pattern
- Each model has a dedicated repository (ProjectRepository, TaskRepository, etc.)
- Repositories handle all SQL and return typed model objects
- Located in `src/main/repositories/`
- All use better-sqlite3 prepared statements for performance and security

## Dependency Management

### Key Dependencies
- **better-sqlite3** ^11.7.0 - SQLite database with C++ performance
- **Electron** ^35.7.5 - Desktop application framework
- **React** 18.3.1 - UI framework
- **Material-UI** 6.1.7 - Component library
- **esbuild** - Fast JavaScript/TypeScript bundler (dev dependency)
- **electron-store** ^8.2.0 - Settings persistence
- **@electron/rebuild** - Native module rebuilding

### Adding Dependencies
```bash
npm install <package>  # Runtime dependency
npm install --save-dev <package>  # Dev dependency
npm run postinstall  # Rebuild native modules for Electron if needed
```

## Common Patterns

### IPC Communication
Main process exposes database operations:
```typescript
// src/main/main.ts
ipcMain.handle('project:findAll', async () => {
  return projectRepo.findAll();
});

// src/renderer (React component)
const projects = await window.electronAPI.project.findAll();
```

### Database Operations
```typescript
// Create
const project = projectRepo.create({
  name: 'My Project',
  description: 'Description',
  status: ProjectStatus.Active,
  conceptWhat: 'What we are building',
  // ... other fields
});

// Read
const project = projectRepo.findById(1);
const all = projectRepo.findAll();

// Update
const updated = projectRepo.update(1, { name: 'New Name' });

// Delete
const success = projectRepo.delete(1);
```

## Testing & Debugging

### Development Mode
- Dev mode enables Chrome DevTools automatically
- Main process logs visible in terminal
- Check `~/.config/DevTrack/devtrack.db` for database inspection

### Database Inspection
```bash
sqlite3 ~/.config/DevTrack/devtrack.db
.tables  # List all tables
SELECT * FROM projects;  # Query data
```

## Current Status (Early Development)
- ✅ Architecture & scaffolding complete
- ✅ Database schema defined
- ✅ Build system working
- ✅ Sample data seeding
- ✅ Projects view loading from database
- 🚧 Task CRUD operations need UI
- 🚧 Kanban board view pending
- 🚧 Comments UI pending

**When adding features**: Refer to `docs/devtrack-master-features.md` for TIER 1 MVP features (task management, board views, etc.)
````
