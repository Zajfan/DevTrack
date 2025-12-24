# DevTrack Production Optimization Plan

**Goal**: Transform DevTrack into a commercial-grade, production-ready application suitable for sale.

**Current Status**: Feature-complete with 28+ major features across 5 tiers  
**Target Status**: Optimized, polished, production-ready for commercial release

---

## 1. Performance Optimizations

### 1.1 Database Optimizations

**Current Issues**:
- Missing indexes on frequently queried columns
- No query result caching
- Unoptimized queries with multiple JOINs
- No pagination on large result sets

**Optimizations**:

```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_status_priority ON tasks(project_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_labels_project_name ON labels(project_id, name);
```

**Implementation**:
- Add migration system for database schema updates
- Implement query result caching (simple in-memory cache with TTL)
- Add pagination to all list endpoints (default 50 items, max 500)
- Use prepared statement pool for frequently executed queries

**Expected Gains**: 40-60% faster query times, reduced memory usage

---

### 1.2 DirectoryScanner Optimizations

**Current Issues**:
- Recursive file size calculation is slow for large directories
- No progress reporting
- Single-threaded processing
- No caching of scan results

**Optimizations**:

```typescript
// Use worker threads for parallel directory scanning
import { Worker } from 'worker_threads';

// Add progress callbacks
export interface ScanProgress {
  totalDirs: number;
  scannedDirs: number;
  foundProjects: number;
  currentPath: string;
}

// Cache directory stats
private statsCache = new Map<string, { size: number; fileCount: number; timestamp: number }>();

// Skip size calculation for huge directories
const MAX_FILES_FOR_SIZE_CALC = 10000;
const MAX_DEPTH_FOR_SIZE = 3;

// Add exclude patterns (configurable)
const DEFAULT_EXCLUDES = [
  'node_modules', '.git', 'dist', 'build', 'target',
  '__pycache__', '.venv', 'venv', '.cache', '.npm',
  '.gradle', '.idea', '.vscode', 'vendor', 'coverage'
];
```

**Implementation**:
- Add progress reporting with callbacks
- Use `fs.promises` for async I/O (non-blocking)
- Implement caching for repeated scans
- Add smart depth limiting based on directory size
- Skip binary/media file enumeration

**Expected Gains**: 5-10x faster scanning, progress visibility, better UX

---

### 1.3 React Component Optimizations

**Current Issues**:
- Re-rendering entire lists on single item update
- No virtualization for long lists
- Missing React.memo on pure components
- Inefficient Material-UI component usage

**Optimizations**:

```typescript
// Add react-window for list virtualization
import { FixedSizeList } from 'react-window';

// Memoize expensive calculations
const sortedTasks = useMemo(() => {
  return tasks.sort((a, b) => /* ... */);
}, [tasks]);

// Use React.memo for pure components
export const TaskCard = React.memo(({ task, onUpdate }: TaskCardProps) => {
  // Component implementation
});

// Debounce search inputs
const debouncedSearch = useMemo(
  () => debounce((value: string) => setSearchTerm(value), 300),
  []
);
```

**Implementation**:
- Add `react-window` for virtualized lists (tasks, projects)
- Wrap pure components in `React.memo`
- Use `useCallback` for event handlers passed to children
- Debounce search/filter inputs
- Lazy load heavy components (charts, Gantt view)
- Code splitting with `React.lazy` and `Suspense`

**Expected Gains**: 50-70% faster rendering, smoother UI, lower memory

---

### 1.4 IPC Communication Optimizations

**Current Issues**:
- No batching of multiple IPC calls
- Large data payloads sent over IPC
- No compression for large results
- Synchronous IPC blocks renderer

**Optimizations**:

```typescript
// Batch multiple IPC calls
export class IPCBatcher {
  private queue: Array<{ channel: string; args: any[] }> = [];
  private timer: NodeJS.Timeout | null = null;

  add(channel: string, ...args: any[]) {
    this.queue.push({ channel, args });
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 10);
    }
  }

  async flush() {
    const batch = this.queue.splice(0);
    await ipcRenderer.invoke('batch', batch);
    this.timer = null;
  }
}

// Implement pagination for large datasets
export async function getTasksPaginated(
  projectId: number,
  page: number = 1,
  pageSize: number = 50
): Promise<{ tasks: Task[]; total: number; page: number }> {
  return window.electronAPI.task.getPaginated(projectId, page, pageSize);
}
```

**Implementation**:
- Add IPC batching for rapid successive calls
- Implement cursor-based pagination
- Compress large payloads with `zlib`
- Stream large datasets instead of loading all at once
- Add request cancellation for aborted operations

**Expected Gains**: 30-50% reduction in IPC overhead, better responsiveness

---

## 2. Code Quality Optimizations

### 2.1 Error Handling

**Current Issues**:
- Inconsistent error handling across codebase
- Generic error messages
- No error recovery mechanisms
- Missing validation in many places

**Improvements**:

```typescript
// Custom error types
export class DatabaseError extends Error {
  constructor(message: string, public code: string, public cause?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Centralized error handler
export class ErrorHandler {
  static handle(error: Error): { message: string; userMessage: string } {
    console.error('Error:', error);

    if (error instanceof ValidationError) {
      return {
        message: error.message,
        userMessage: `Invalid ${error.field}: ${error.message}`
      };
    }

    if (error instanceof DatabaseError) {
      return {
        message: error.message,
        userMessage: 'Database error occurred. Please try again.'
      };
    }

    return {
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again.'
    };
  }
}

// Input validation
import Joi from 'joi';

const taskSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(5000).optional(),
  status: Joi.string().valid('todo', 'in_progress', 'review', 'done', 'blocked').required(),
  priority: Joi.string().valid('urgent', 'high', 'normal', 'low').optional(),
  assignee: Joi.number().integer().positive().optional(),
  dueDate: Joi.date().optional()
});
```

**Implementation**:
- Define custom error classes for different error types
- Add comprehensive input validation (Joi or Zod)
- Implement error boundaries in React
- Add retry logic for transient failures
- Log errors to file for debugging

**Expected Gains**: Fewer crashes, better error messages, easier debugging

---

### 2.2 Type Safety

**Current Issues**:
- Some `any` types still present
- Missing null checks in places
- Incomplete TypeScript coverage

**Improvements**:

```typescript
// Enable strict null checks in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}

// Use discriminated unions for complex types
type TaskFilter = 
  | { type: 'status'; value: TaskStatus }
  | { type: 'priority'; value: TaskPriority }
  | { type: 'assignee'; value: number }
  | { type: 'label'; value: number };

// Add runtime type guards
function isTask(obj: unknown): obj is Task {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'status' in obj
  );
}
```

**Implementation**:
- Remove all `any` types, replace with proper types or `unknown`
- Add null safety throughout codebase
- Use discriminated unions for complex state
- Add runtime type validation for external data
- Enable all strict TypeScript compiler flags

**Expected Gains**: Fewer runtime errors, better IDE support, safer refactoring

---

### 2.3 Code Organization

**Current Issues**:
- Some files exceed 1000 lines
- Mixing concerns in single files
- Inconsistent naming conventions
- Duplicate code in places

**Improvements**:

```
src/
├── main/
│   ├── core/              # Core business logic
│   │   ├── TaskService.ts
│   │   ├── ProjectService.ts
│   │   └── UserService.ts
│   ├── data/              # Data access layer
│   │   ├── repositories/
│   │   └── migrations/
│   ├── infrastructure/    # Infrastructure concerns
│   │   ├── database/
│   │   ├── security/
│   │   └── logging/
│   └── presentation/      # IPC handlers
│       └── handlers/
└── renderer/
    ├── features/          # Feature-based organization
    │   ├── tasks/
    │   │   ├── components/
    │   │   ├── hooks/
    │   │   ├── utils/
    │   │   └── types/
    │   └── projects/
    └── shared/            # Shared utilities
        ├── components/
        ├── hooks/
        └── utils/
```

**Implementation**:
- Refactor large files into smaller modules
- Organize by feature instead of type
- Extract common utilities to shared folder
- Apply consistent naming (PascalCase for classes/components, camelCase for functions)
- Create shared hooks for common patterns

**Expected Gains**: Better maintainability, easier onboarding, clearer structure

---

## 3. Security Hardening

### 3.1 Input Sanitization

**Current Issues**:
- Limited input validation
- No XSS protection in rich text
- Missing CSRF protection on API

**Improvements**:

```typescript
// HTML sanitization
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title']
  });
}

// SQL injection prevention (already using prepared statements, but add checks)
export function validateIdentifier(identifier: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

// Add rate limiting per user
const userRateLimits = new Map<number, { count: number; resetAt: number }>();

function checkRateLimit(userId: number): boolean {
  const limit = userRateLimits.get(userId);
  const now = Date.now();

  if (!limit || now > limit.resetAt) {
    userRateLimits.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 100) {
    return false; // Rate limit exceeded
  }

  limit.count++;
  return true;
}
```

**Implementation**:
- Add DOMPurify for HTML sanitization
- Implement CSRF tokens for API
- Add per-user rate limiting
- Validate all file uploads (type, size, content)
- Add Content Security Policy headers

**Expected Gains**: Protection against common web vulnerabilities

---

### 3.2 Authentication & Authorization

**Current Issues**:
- Demo password in production code
- No session expiration
- Missing permission checks in some handlers

**Improvements**:

```typescript
// Environment-based configuration
export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || throwError('JWT_SECRET required'),
    expiresIn: '24h'
  },
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    rolling: true
  },
  security: {
    bcryptRounds: 12,
    passwordMinLength: 8,
    requireMFA: process.env.REQUIRE_MFA === 'true'
  }
};

// Add permission middleware
function requirePermission(permission: string) {
  return async (userId: number, projectId: number) => {
    const hasPermission = await permissionHelper.checkPermission(
      userId,
      projectId,
      permission
    );
    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }
  };
}

// Session management
export class SessionManager {
  private sessions = new Map<string, Session>();

  create(userId: number): Session {
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
      userId,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.session.maxAge)
    };
    this.sessions.set(token, session);
    return session;
  }

  cleanup() {
    const now = new Date();
    for (const [token, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
      }
    }
  }
}
```

**Implementation**:
- Remove hardcoded credentials
- Add environment variables for secrets
- Implement session expiration and cleanup
- Add permission checks to all IPC handlers
- Add 2FA enforcement option
- Implement account lockout after failed attempts

**Expected Gains**: Enterprise-grade security, compliance readiness

---

## 4. Testing Infrastructure

### 4.1 Unit Tests

**Current Status**: No automated tests

**Target Coverage**: 70%+ code coverage

```typescript
// Example test structure
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskRepository } from '../repositories/TaskRepository';
import Database from 'better-sqlite3';

describe('TaskRepository', () => {
  let db: Database.Database;
  let taskRepo: TaskRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    // Initialize schema
    taskRepo = new TaskRepository(db);
  });

  it('should create a task', () => {
    const task = taskRepo.create({
      title: 'Test Task',
      projectId: 1,
      status: TaskStatus.Todo
    });

    expect(task).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.status).toBe(TaskStatus.Todo);
  });

  it('should find task by id', () => {
    const created = taskRepo.create({ title: 'Test', projectId: 1 });
    const found = taskRepo.findById(created.id);

    expect(found).toEqual(created);
  });

  it('should update task status', () => {
    const task = taskRepo.create({ title: 'Test', projectId: 1 });
    const updated = taskRepo.update(task.id, { status: TaskStatus.Done });

    expect(updated?.status).toBe(TaskStatus.Done);
  });
});
```

**Implementation**:
- Add Vitest for unit testing
- Test all repositories (CRUD operations)
- Test all services (business logic)
- Test utility functions
- Mock database for tests
- Add test coverage reporting

**Expected Coverage**:
- Repositories: 90%+
- Services: 80%+
- Utilities: 90%+
- Overall: 70%+

---

### 4.2 Integration Tests

```typescript
// Example integration test
describe('Task Management Flow', () => {
  it('should create project and add tasks', async () => {
    // Create project
    const project = await projectRepo.create({
      name: 'Test Project',
      status: ProjectStatus.Active
    });

    // Add tasks
    const task1 = await taskRepo.create({
      title: 'Task 1',
      projectId: project.id
    });

    const task2 = await taskRepo.create({
      title: 'Task 2',
      projectId: project.id
    });

    // Add dependency
    await dependencyRepo.create({
      taskId: task2.id,
      dependsOnTaskId: task1.id,
      dependencyType: DependencyType.Blocks
    });

    // Verify dependency
    const blocking = await dependencyRepo.getBlockingTasks(task2.id);
    expect(blocking).toHaveLength(1);
    expect(blocking[0].id).toBe(task1.id);
  });
});
```

**Implementation**:
- Test complete workflows (create project → add tasks → dependencies)
- Test IPC communication
- Test automation rules execution
- Test data integrity constraints

---

### 4.3 E2E Tests

```typescript
// Example E2E test with Playwright
import { test, expect } from '@playwright/test';

test('create and manage task', async ({ page }) => {
  // Launch app
  await page.goto('http://localhost:3000');

  // Click "New Project"
  await page.click('button:has-text("New Project")');

  // Fill form
  await page.fill('input[name="name"]', 'E2E Test Project');
  await page.fill('textarea[name="description"]', 'Test description');

  // Submit
  await page.click('button:has-text("Create")');

  // Verify project appears
  await expect(page.locator('text=E2E Test Project')).toBeVisible();

  // Create task
  await page.click('button:has-text("New Task")');
  await page.fill('input[name="title"]', 'Test Task');
  await page.click('button:has-text("Save")');

  // Verify task appears
  await expect(page.locator('text=Test Task')).toBeVisible();
});
```

**Implementation**:
- Add Playwright for E2E testing
- Test critical user flows
- Test across different views (Board, List, Calendar, etc.)
- Test drag-and-drop interactions
- Screenshot comparison for visual regression

---

## 5. Build & Deployment Optimizations

### 5.1 Build Performance

**Current Issues**:
- No build caching
- Full rebuild every time
- Large bundle sizes

**Improvements**:

```javascript
// webpack.config.js or vite.config.ts
export default {
  build: {
    // Enable caching
    cache: true,
    
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'chart-vendor': ['recharts'],
        }
      }
    },
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // Source maps for production debugging
    sourcemap: 'hidden'
  }
};
```

**Implementation**:
- Enable incremental builds
- Add build caching (esbuild cache, webpack cache)
- Implement code splitting
- Tree-shaking optimization
- Compress assets with gzip/brotli
- Remove unused dependencies

**Expected Gains**: 50-70% faster builds, 30-40% smaller bundles

---

### 5.2 Packaging Optimization

```json
// electron-builder.yml
{
  "appId": "com.thenohandscompany.devtrack",
  "productName": "DevTrack",
  "compression": "maximum",
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "resources",
      "to": "resources"
    }
  ],
  "win": {
    "target": ["nsis", "portable"],
    "icon": "build/icon.ico",
    "certificateSubjectName": "The No Hands Company"
  },
  "mac": {
    "target": ["dmg", "zip"],
    "category": "public.app-category.productivity",
    "icon": "build/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Development",
    "icon": "build/icons"
  }
}
```

**Implementation**:
- Maximum compression for installers
- Code signing for Windows/Mac
- Auto-update configuration
- Separate dev/prod configurations
- Multi-platform builds in CI/CD

---

## 6. UX/UI Polish

### 6.1 Loading States

**Current Issues**:
- Instant transitions can feel jarring
- No loading indicators on slow operations
- No skeleton screens

**Improvements**:

```typescript
// Add loading states
export const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
      </Box>
    );
  }

  return <div>{/* Task list */}</div>;
};

// Add optimistic updates
const handleStatusChange = async (taskId: number, status: TaskStatus) => {
  // Optimistic update
  setTasks(tasks.map(t => 
    t.id === taskId ? { ...t, status } : t
  ));

  try {
    await window.electronAPI.task.update(taskId, { status });
  } catch (error) {
    // Revert on error
    loadTasks();
    showError('Failed to update task');
  }
};
```

**Implementation**:
- Add skeleton screens for loading states
- Implement optimistic updates for better perceived performance
- Add smooth transitions (200-300ms)
- Show progress indicators for long operations
- Add success/error toast notifications

---

### 6.2 Accessibility

```typescript
// Add ARIA labels
<button
  aria-label="Create new task"
  aria-describedby="task-create-help"
>
  <AddIcon />
</button>

// Keyboard navigation
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'n':
      if (e.ctrlKey) {
        e.preventDefault();
        createNewTask();
      }
      break;
    case 'Escape':
      closeDialog();
      break;
  }
};

// Focus management
const firstInputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  if (dialogOpen) {
    firstInputRef.current?.focus();
  }
}, [dialogOpen]);
```

**Implementation**:
- Add ARIA labels to all interactive elements
- Implement keyboard navigation for all features
- Add focus management for dialogs
- Test with screen readers
- Add high contrast mode support
- Ensure color contrast meets WCAG 2.1 AA

---

## 7. Documentation

### 7.1 User Documentation

- **Getting Started Guide**: Installation, first project, first task
- **User Manual**: Complete feature documentation with screenshots
- **Video Tutorials**: 5-10 minute videos for key features
- **FAQ**: Common questions and troubleshooting
- **Keyboard Shortcuts**: Printable cheat sheet

### 7.2 Developer Documentation

- **Architecture Guide**: System overview, design decisions
- **API Documentation**: All IPC handlers, REST endpoints
- **Contributing Guide**: How to contribute, code standards
- **Database Schema**: ER diagrams, table descriptions
- **Extension Guide**: How to add custom features

---

## 8. Monitoring & Analytics

### 8.1 Error Tracking

```typescript
// Sentry integration (optional)
import * as Sentry from '@sentry/electron';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: app.getVersion(),
  beforeSend(event) {
    // Scrub sensitive data
    return event;
  }
});

// Local error logging
export class ErrorLogger {
  private logPath: string;

  constructor() {
    this.logPath = path.join(app.getPath('userData'), 'logs', 'errors.log');
  }

  log(error: Error, context?: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context
    };

    fs.appendFileSync(
      this.logPath,
      JSON.stringify(entry) + '\n'
    );
  }
}
```

### 8.2 Usage Analytics (Privacy-Respecting)

```typescript
// Optional local analytics (no external tracking)
export class UsageAnalytics {
  track(event: string, properties?: Record<string, any>) {
    if (!settingsManager.get('analytics.enabled')) {
      return; // Respect user privacy settings
    }

    const entry = {
      event,
      properties,
      timestamp: new Date().toISOString()
    };

    // Store locally only
    this.saveToLocalStorage(entry);
  }

  getUsageStats() {
    return {
      tasksCreated: this.count('task.created'),
      projectsCreated: this.count('project.created'),
      mostUsedViews: this.getMostUsedViews(),
      averageSessionDuration: this.getAverageSessionDuration()
    };
  }
}
```

---

## 9. Implementation Priority

### Phase 1: Critical (Week 1-2)
1. ✅ Database indexes
2. ✅ Error handling and validation
3. ✅ Security hardening (remove demo credentials)
4. ✅ Type safety improvements
5. ✅ Basic loading states

### Phase 2: Important (Week 3-4)
6. ✅ React component optimization
7. ✅ IPC batching and pagination
8. ✅ DirectoryScanner optimization
9. ✅ Code organization refactoring
10. ✅ Unit test infrastructure (50% coverage)

### Phase 3: Polish (Week 5-6)
11. ✅ Build optimizations
12. ✅ UX polish (skeleton screens, transitions)
13. ✅ Accessibility improvements
14. ✅ User documentation
15. ✅ Integration tests

### Phase 4: Release (Week 7-8)
16. ✅ E2E tests
17. ✅ Packaging and code signing
18. ✅ Auto-update system
19. ✅ Error tracking setup
20. ✅ Final security audit

---

## 10. Success Metrics

**Performance**:
- App startup time: < 2 seconds
- Task list render: < 100ms for 1000 tasks
- Search response: < 200ms
- Database queries: < 50ms average
- Bundle size: < 100MB installed

**Quality**:
- Test coverage: > 70%
- TypeScript strict mode: 100%
- Zero console errors in production
- Zero security vulnerabilities (npm audit)

**UX**:
- First-time user onboarding completion: > 80%
- Task creation time: < 30 seconds (from launch)
- User satisfaction: > 4.5/5 (post-launch survey)

---

## Estimated Timeline

**Total Time**: 8 weeks for production-ready release

**Week 1-2**: Critical optimizations (database, security, errors)  
**Week 3-4**: Code quality and performance  
**Week 5-6**: Testing and documentation  
**Week 7-8**: Final polish and release preparation  

---

## Budget Considerations (If Hiring Help)

**Solo Development**: 8 weeks full-time  
**With 1 Developer**: 4-5 weeks  
**With Team (2-3)**: 2-3 weeks  

**External Services** (Optional):
- Code signing certificate: $200-500/year
- Sentry error tracking: $0-26/month
- Cloud storage for backups: $5-20/month
- Domain and hosting: $50-100/year

---

## Next Steps

1. **Immediate**: Run production build and identify bottlenecks
2. **This Week**: Implement Phase 1 (critical optimizations)
3. **Next Week**: Begin Phase 2 (performance improvements)
4. **Month 2**: Testing and polish
5. **Launch**: Soft launch to beta testers, gather feedback

---

**Status**: Ready to begin optimization phase  
**Current Priority**: Phase 1 - Critical optimizations  
**Target Release**: 8 weeks from start date
