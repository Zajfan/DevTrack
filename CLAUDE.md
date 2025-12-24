# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevTrack is a **native Electron desktop application** for AI-assisted solo development project management. It uses a concept-driven 5W1H framework (What, How, Where, With What, When, Why) to organize projects, tasks, and planning.

**Key Architecture**: Single-process Electron app with TypeScript throughout—no separate HTTP server or C++ backend process. Database operations run in-process via better-sqlite3.

## Build & Development Commands

### Development
```bash
npm run dev
# Compiles TypeScript (main + preload), bundles React with esbuild, launches Electron with DevTools
```

### Build Only (No Launch)
```bash
npm run build
# Runs: build:main && build:renderer && copy:assets
```

### Package for Distribution
```bash
npm run package
# Uses electron-builder to create installers
```

### Type Checking
```bash
npm run typecheck
# Runs TypeScript compiler in check-only mode
```

### Clean Build
```bash
npm run clean
# Removes dist/ and node_modules/
```

## Architecture: Single-Process Electron Desktop App

Unlike the README.md documentation which describes a planned C++23 backend, the **actual implementation** is a pure TypeScript Electron app following VS Code's architecture:

- **Main Process** (Node.js): Database operations with better-sqlite3, IPC handlers, window management
- **Renderer Process** (Chromium): React UI with Material-UI components
- **Preload Bridge**: Type-safe IPC communication (no HTTP/WebSocket)
- **Database**: SQLite with better-sqlite3 (C++ performance, TypeScript interface)
- **Bundling**: esbuild for React (no dev server needed)

### Critical 5W1H Concept Fields

Projects have six concept fields that are **core to the project philosophy** and must never be removed or renamed:

- `concept_what` / `conceptWhat` - What is being built
- `concept_how` / `conceptHow` - Implementation approach
- `concept_where` / `conceptWhere` - Deployment/location
- `concept_with_what` / `conceptWithWhat` - Tools/technologies
- `concept_when` / `conceptWhen` - Timeline/schedule
- `concept_why` / `conceptWhy` - Purpose/justification

These fields exist in:
- Database: `projects` table (`concept_what`, `concept_how`, etc. as snake_case columns)
- TypeScript: `Project` interface (`conceptWhat`, `conceptHow`, etc. as camelCase properties)
- Repositories: Mapping layer converts between snake_case and camelCase

## Directory Structure

```
DevTrack/
├── src/
│   ├── main/                    # Main process (Node.js)
│   │   ├── database/
│   │   │   └── Database.ts     # SQLite manager (better-sqlite3)
│   │   ├── models/             # TypeScript interfaces (Project, Task, etc.)
│   │   ├── repositories/       # Database CRUD operations
│   │   ├── services/           # Business logic (TemplateService, AutomationEngine, etc.)
│   │   ├── utils/              # Helpers (seed data, DirectoryScanner, etc.)
│   │   └── main.ts             # Entry point (initializes DB, registers IPC, creates window)
│   ├── preload/
│   │   └── preload.ts          # IPC bridge (exposes window.electronAPI)
│   └── renderer/               # Renderer process (React)
│       ├── components/         # Reusable UI components
│       ├── views/              # Page components (Dashboard, Projects, Tasks, etc.)
│       ├── layouts/            # Layout components
│       ├── services/           # IPC client for database operations
│       ├── types/              # Type definitions
│       └── main.tsx            # React entry point
├── dist/                       # Build output (tsc CommonJS + esbuild bundle)
├── scripts/                    # Build scripts (build-renderer.js with esbuild config)
├── docs/                       # Architecture docs
└── package.json
```

## Code Patterns

### TypeScript Models (src/main/models/)

Define data models with TypeScript interfaces and enums:

```typescript
export interface Task {
  id: number;
  projectId: number;
  title: string;
  status: TaskStatus;
  // ... other fields
}

export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in_progress',
  Done = 'done'
}

export interface CreateTaskData {
  projectId: number;
  title: string;
  status?: TaskStatus;
  // ... optional fields
}
```

### Repository Pattern (src/main/repositories/)

Class-based repositories with Database instance injected via constructor:

```typescript
export class TaskRepository {
  constructor(private db: Database.Database) {}

  create(data: CreateTaskData): Task {
    const stmt = this.db.prepare(`INSERT INTO tasks...`);
    const result = stmt.run(data);
    return this.findById(result.lastInsertRowid as number)!;
  }

  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      projectId: row.project_id, // snake_case → camelCase
      // ...
    };
  }
}
```

**Important**: All repositories map between database snake_case columns and TypeScript camelCase properties.

### IPC Communication (src/main/main.ts + src/preload/preload.ts)

Main process registers IPC handlers:
```typescript
ipcMain.handle('task:findAll', async () => {
  return taskRepo.findAll();
});
```

Preload exposes type-safe API:
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  task: {
    findAll: () => ipcRenderer.invoke('task:findAll'),
  }
});
```

Renderer calls API:
```typescript
const tasks = await window.electronAPI.task.findAll();
```

### React Components (src/renderer/)

Use Material-UI components with TypeScript:

```typescript
import { Project } from '../types';

export const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
  const handleClick = async () => {
    const tasks = await window.electronAPI.task.findByProjectId(project.id);
  };

  return <Card onClick={handleClick}>...</Card>;
};
```

## Database Layer

### SQLite Schema

Key tables:
- `projects` - With 5W1H concept fields (concept_what, concept_how, etc.)
- `tasks` - With project_id foreign key (CASCADE on delete)
- `comments`, `labels`, `task_labels`, `attachments`
- `custom_fields`, `task_custom_values`
- `users`, `roles`, `permissions`, `project_members`
- `notifications`, `time_entries`, `automation_rules`
- `project_templates`, `task_templates`
- `vision_boards`, `vision_board_nodes`, `vision_board_connections`, `vision_board_groups`

Database location: `~/.config/DevTrack/devtrack.db` (Linux) or equivalent user data directory

### Inspecting Database

```bash
sqlite3 ~/.config/DevTrack/devtrack.db
.tables                    # List all tables
SELECT * FROM projects;    # Query data
.schema projects           # Show table schema
```

## Key Dependencies

- **better-sqlite3** ^11.7.0 - SQLite database (C++ performance)
- **Electron** ^35.7.5 - Desktop framework
- **React** 18.3.1 - UI framework
- **Material-UI** 6.1.7 - Component library
- **esbuild** - Fast bundler (dev dependency)
- **electron-store** ^8.2.0 - Settings persistence
- **TypeScript** ^5.6.3 - Type safety

### Adding Native Dependencies

After adding dependencies that include native modules:
```bash
npm run postinstall  # Rebuilds native modules for Electron
```

## Development Workflow

### Making Changes to Main Process

1. Edit files in `src/main/`
2. Run `npm run dev` (recompiles TypeScript and launches)
3. Check terminal for main process logs
4. Inspect database at `~/.config/DevTrack/devtrack.db`

### Making Changes to Renderer

1. Edit files in `src/renderer/`
2. Run `npm run dev` (bundles React with esbuild and launches)
3. DevTools open automatically in development mode
4. Use React DevTools for component inspection

### Database Changes

1. Update schema in `src/main/database/Database.ts` (`createTables()` method)
2. Update model interfaces in `src/main/models/`
3. Update repositories in `src/main/repositories/`
4. Update preload bridge types in `src/preload/preload.ts`
5. Delete database file to recreate with new schema: `rm ~/.config/DevTrack/devtrack.db`
6. Restart app to initialize fresh database

## Testing & Debugging

### Development Mode
- Chrome DevTools open automatically (`NODE_ENV=development`)
- Main process logs in terminal
- Renderer logs in DevTools console

### Common Issues

**Database locked**: Close all Electron instances
**Type errors**: Run `npm run typecheck`
**Build fails**: Run `npm run clean && npm install && npm run build`
**Native module errors**: Run `npm run postinstall`

## Coding Conventions

### TypeScript
- Strict mode enabled (no `any` without good reason)
- Interfaces for data models
- Enums for status/type values
- Async/await (no callbacks)
- Explicit return types on public methods

### Naming
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Classes: `PascalCase`
- Functions: `camelCase`
- Database columns: `snake_case`
- TypeScript properties: `camelCase`

### File Organization
- One model/repository/service per file
- Export types and classes from `index.ts` barrel files
- Keep React components focused (extract hooks for complex logic)

## Important Notes

1. **Architecture Mismatch**: The README.md describes a planned C++23 backend, but the actual implementation is pure TypeScript/Electron. The codebase should be treated as a **native desktop app**, not a client-server architecture.

2. **5W1H Concept Framework**: The six concept fields (conceptWhat, conceptHow, etc.) are fundamental to the project's philosophy. Do not remove, rename, or refactor these fields without explicit approval.

3. **Database Operations**: All database operations must go through repositories. Never use raw SQL in React components or services.

4. **IPC Type Safety**: The preload bridge provides type-safe IPC. Always use `window.electronAPI` in renderer code, never call `ipcRenderer` directly.

5. **Better-sqlite3**: Database operations are synchronous (not async), which is correct for this library. Don't add `await` to repository method calls in main process code (but IPC calls from renderer are async).

## Feature Implementation Status

All core features are **fully implemented and functional**:

### ✅ Core Features (Complete)
- **Architecture & Scaffolding**: Single-process Electron app with TypeScript
- **Database Schema**: Comprehensive SQLite schema with 20+ tables
- **Build System**: esbuild + TypeScript compilation working
- **Sample Data Seeding**: Seed data utility in `src/main/utils/seedData.ts`
- **Project Management**: Full CRUD with 5W1H concept fields

### ✅ Task Management (Complete)
**File**: `src/renderer/views/Tasks.tsx` (920 lines)
- **Task CRUD**: Full create, read, update, delete with dialogs
- **Kanban Board**: Drag-and-drop with react-beautiful-dnd (5 status columns)
- **List View**: Sortable table with filtering and search
- **Custom Fields**: Dynamic per-project fields
- **Labels**: Color-coded label system
- **Dependencies**: Task blocking/blocked-by relationships
- **Attachments**: File upload, open, delete with cleanup
- **Time Tracking**: Start/stop timer with time entries
- **Filtering**: By project, label, search query
- **Priorities**: Critical, High, Medium, Low with color coding

### ✅ Kanban Board Features (Complete)
**File**: `src/renderer/views/Tasks.tsx` (lines 456-615)
- Drag-and-drop task cards between columns
- 5 status columns: To Do, In Progress, Review, Done, Blocked
- Task count badges per column
- Color-coded columns with priority indicators
- Label display on cards
- Due date display
- Inline edit/delete buttons
- Smooth drag animations
- Live status updates via drag-drop

### ✅ Comments System (Complete)
**File**: `src/renderer/views/TaskDetail.tsx` (lines 448-554)
- Comment creation with Ctrl+Enter support
- Comment editing inline
- Comment deletion with confirmation
- Author attribution and timestamps
- Edit indicator ("edited" marker)
- Empty state messaging
- Full CRUD operations

### ✅ Advanced Features (Complete)
- **Templates**: Project and task templates with TemplateService
- **Automation**: Rule-based automation engine with triggers/actions
- **Analytics**: Reporting and statistics service
- **Multiple Views**: Calendar, Timeline/Gantt, Table, Gallery, Vision Boards
- **Vision Boards**: Node-based planning with connections and groups
- **Users & Roles**: User management with permissions and RBAC
- **Notifications**: In-app notification system
- **Audit Logging**: Comprehensive audit trail for compliance
- **Settings**: Theme, preferences, export/import
- **Security**: Password hashing, API keys, session management
- **Integrations**: External service integration framework
- **White-Label**: Multi-tenant branding support
- **Compliance**: GDPR, data retention, legal holds

### 📁 Key Implementation Files

**Views** (13 files in `src/renderer/views/`):
- `Dashboard.tsx` - Project overview and statistics
- `Projects.tsx` - Project list and management
- `ProjectDetail.tsx` - Individual project details
- `Tasks.tsx` - Kanban board and list view
- `TaskDetail.tsx` - Task details with comments and attachments
- `Templates.tsx` - Template management
- `Timeline.tsx` - Gantt chart view
- `CalendarView.tsx` - Calendar interface
- `TableView.tsx` - Spreadsheet view
- `GalleryView.tsx` - Gallery view
- `VisionBoardView.tsx` - Vision board editor
- `Users.tsx` - User management
- `SettingsView.tsx` - Application settings

**Components** (13 files in `src/renderer/components/`):
- `LabelManager.tsx` - Label assignment dialog
- `DependencyManager.tsx` - Task dependency management
- `CustomFieldInput.tsx` - Custom field input component
- `CustomFieldManager.tsx` - Custom field configuration
- `TimeTracker.tsx` - Time tracking widget
- `AutomationRuleEditor.tsx` - Automation configuration
- `GanttChart.tsx` - Gantt chart rendering
- `SaveAsTemplateDialog.tsx` - Template creation
- `TemplatePickerDialog.tsx` - Template selection
- `NotificationCenter.tsx` - Notification management
- `ProjectMembers.tsx` - Team member management
- `VisionBoardEditor.tsx` - Vision board editing
- `VisionBoardGallery.tsx` - Vision board gallery

**Repositories** (16 files in `src/main/repositories/`):
- TaskRepository, CommentRepository, ProjectRepository
- LabelRepository, AttachmentRepository, CustomFieldRepository
- TaskDependencyRepository, UserRepository, RoleRepository
- PermissionRepository, ProjectMemberRepository, NotificationRepository
- ProjectTemplateRepository, TaskTemplateRepository, TimeEntryRepository
- AutomationRuleRepository

**Services** (11 files in `src/main/services/`):
- TemplateService, AutomationEngine, AnalyticsService
- SettingsManager, SecurityManager, AuditLogger
- AdminManager, IntegrationManager, WhiteLabelManager
- ComplianceManager, VisionBoardManager

**IPC Handlers**: 50+ handlers in `src/main/main.ts` covering all operations

Refer to `docs/` for detailed architecture documentation.
