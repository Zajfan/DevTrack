# DevTrack Phase 1: Solo Developer Foundation

## Revised Priority: SOLO USER FIRST 🎯

**Philosophy**: Build a powerful personal PMS that ONE person can use effectively. Multi-user features come later.

---

## IMMEDIATE PRIORITIES (Next 2 Weeks)

### Week 1: Core Infrastructure

#### Day 1-2: Build System & Dependencies
- [ ] Set up logging framework (spdlog)
- [ ] Add nlohmann/json (already in external/)
- [ ] Add CLI argument parser library (cxxopts or CLI11)
- [ ] Set up Google Test for unit testing
- [ ] Create migration system for database schema updates

#### Day 3-4: Core Models (Solo User Simplified)
- [ ] **User** model (single user - just name, email, preferences)
  - No authentication needed initially
  - Just one default user in the database
- [ ] **Comment** model (task/project comments)
- [ ] **Label** model (tags for tasks)
- [ ] **Attachment** model (file references)
- [ ] **CustomField** model (user-defined fields)

#### Day 5-7: Database Layer Completion
- [ ] Complete all repository implementations
- [ ] Add database migrations system
- [ ] Database indexes for performance
- [ ] Full CRUD operations for all models
- [ ] Unit tests for repositories

---

## Week 2: API & Services

### Backend Services
- [ ] ProjectService (business logic)
- [ ] TaskService (business logic)
- [ ] CommentService
- [ ] LabelService
- [ ] AttachmentService
- [ ] SearchService (full-text search)

### API Endpoints (REST)
```cpp
// Projects
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id

// Tasks
GET    /api/tasks
GET    /api/tasks/:id
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
GET    /api/projects/:id/tasks

// Comments
GET    /api/tasks/:id/comments
POST   /api/tasks/:id/comments
PUT    /api/comments/:id
DELETE /api/comments/:id

// Labels
GET    /api/labels
POST   /api/labels
PUT    /api/labels/:id
DELETE /api/labels/:id

// Attachments
GET    /api/attachments/:id
POST   /api/tasks/:id/attachments
DELETE /api/attachments/:id

// Search
GET    /api/search?q=query

// Health
GET    /api/health
```

---

## SOLO USER FEATURE PRIORITIES

### ✅ PHASE 1: MVP (Weeks 1-4)
**Goal: Usable personal task manager**

#### Core Features
- [x] Create/edit/delete projects
- [x] Create/edit/delete tasks
- [x] Task status (To Do, In Progress, Completed)
- [x] Task priority (Low, Medium, High, Critical)
- [ ] Task due dates
- [ ] Task descriptions (rich text/Markdown)
- [ ] Comments on tasks
- [ ] Labels/tags
- [ ] File attachments
- [ ] Basic search
- [ ] List view
- [ ] Board/Kanban view

#### Database Schema (Solo)
```sql
-- No users table needed initially! Just hardcode user_id = 1

CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    -- 5W1H Concepts
    concept_what TEXT,
    concept_how TEXT,
    concept_where TEXT,
    concept_with_what TEXT,
    concept_when TEXT,
    concept_why TEXT,
    -- Metadata
    color TEXT,
    icon TEXT,
    is_favorite BOOLEAN DEFAULT 0,
    is_archived BOOLEAN DEFAULT 0
);

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    parent_task_id INTEGER,  -- For subtasks
    title TEXT NOT NULL,
    description TEXT,  -- Markdown supported
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    start_date DATETIME,
    completed_date DATETIME,
    estimated_hours REAL DEFAULT 0,
    actual_hours REAL DEFAULT 0,
    progress INTEGER DEFAULT 0,  -- 0-100%
    is_completed BOOLEAN DEFAULT 0,
    position INTEGER DEFAULT 0,  -- For manual ordering
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_labels (
    task_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    content TEXT NOT NULL,  -- Markdown supported
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME,
    is_edited BOOLEAN DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,  -- Local file system path
    file_size INTEGER,
    mime_type TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE custom_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    field_type TEXT NOT NULL,  -- text, number, date, dropdown, checkbox
    options TEXT,  -- JSON array for dropdown options
    project_id INTEGER,  -- NULL = global custom field
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE task_custom_values (
    task_id INTEGER NOT NULL,
    custom_field_id INTEGER NOT NULL,
    value TEXT,
    PRIMARY KEY (task_id, custom_field_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_attachments_task ON attachments(task_id);
```

---

### ✅ PHASE 2: ENHANCED SOLO FEATURES (Weeks 5-8)
**Goal: Power user features**

- [ ] Task dependencies (blocking/blocked by)
- [ ] Subtasks (nested up to 7 levels)
- [ ] Task templates
- [ ] Project templates
- [ ] Recurring tasks
- [ ] Time tracking (manual entry + timer)
- [ ] Gantt chart view
- [ ] Calendar view
- [ ] Advanced search & filters
- [ ] Saved searches
- [ ] Bulk operations
- [ ] Task duplication
- [ ] Drag-and-drop reordering
- [ ] Keyboard shortcuts

---

### ✅ PHASE 3: PRODUCTIVITY BOOST (Weeks 9-12)
**Goal: Make it indispensable**

- [ ] Dashboard with widgets
- [ ] Activity feed
- [ ] Quick capture (inbox)
- [ ] Focus mode
- [ ] Today view
- [ ] Upcoming view
- [ ] My priorities view
- [ ] Favorites/starred items
- [ ] Recently viewed
- [ ] Custom views (saved)
- [ ] Workload view
- [ ] Progress tracking
- [ ] Reports (velocity, time spent, etc.)
- [ ] Export to PDF/Excel
- [ ] Backup/restore

---

### ✅ PHASE 4: AUTOMATION & INTELLIGENCE (Weeks 13-16)
**Goal: Work smarter, not harder**

- [ ] Basic automation rules
  - Auto-move tasks based on status
  - Auto-assign labels
  - Auto-set due dates
- [ ] Recurring task automation
- [ ] Task reminders/notifications
- [ ] Smart suggestions
- [ ] Duplicate detection
- [ ] Related tasks suggestions
- [ ] Time estimates based on history
- [ ] Custom workflows
- [ ] Keyboard-driven workflows

---

### ✅ PHASE 5: AGILE FEATURES (Solo) (Weeks 17-20)
**Goal: Support agile workflows for solo devs**

- [ ] Sprints (personal sprints)
- [ ] Sprint planning
- [ ] Backlog management
- [ ] Story points
- [ ] Velocity tracking
- [ ] Burn-down charts
- [ ] Epic management
- [ ] Release planning
- [ ] Kanban with WIP limits

---

### ✅ PHASE 6: ADVANCED FEATURES (Weeks 21-24)
**Goal: Professional-grade PMS**

- [ ] Goals & OKRs
- [ ] Project roadmaps
- [ ] Mind maps
- [ ] Document storage (Markdown notes)
- [ ] Wiki pages
- [ ] Meeting notes
- [ ] Decision logs
- [ ] Time blocking
- [ ] Pomodoro timer integration
- [ ] Eisenhower matrix view
- [ ] GTD (Getting Things Done) workflow

---

### ✅ PHASE 7: INTEGRATIONS (Solo Focused) (Weeks 25-28)
**Goal: Connect with your workflow**

- [ ] Git integration (track commits)
- [ ] GitHub/GitLab integration
- [ ] Email integration (create tasks from emails)
- [ ] Calendar sync (iCal, Google Calendar)
- [ ] File system integration
- [ ] Code editor integration (VS Code extension)
- [ ] CLI tool (fully featured)
- [ ] Import from other tools (Todoist, Trello, Notion)
- [ ] Export to various formats

---

### ❌ DEFERRED: Multi-User Features (Phase 8+)
**These come AFTER solo features are solid:**

- User management
- Authentication (login/password)
- Team collaboration
- Permissions & roles
- Real-time collaboration
- Comments with @mentions
- Task assignments to others
- Notifications to other users
- Activity feed for team
- Guest access
- Workspaces for teams
- SSO / OAuth

---

## IMPLEMENTATION ORDER (Next Steps)

### 1️⃣ This Week (Week 1)

#### Monday-Tuesday: Logging & Dependencies
```cpp
// Add spdlog for logging
// backend/CMakeLists.txt - add to external/CMakeLists.txt
FetchContent_Declare(
    spdlog
    GIT_REPOSITORY https://github.com/gabime/spdlog.git
    GIT_TAG v1.12.0
)
FetchContent_MakeAvailable(spdlog)

// Add cxxopts for CLI parsing
FetchContent_Declare(
    cxxopts
    GIT_REPOSITORY https://github.com/jarro2783/cxxopts.git
    GIT_TAG v3.1.1
)
FetchContent_MakeAvailable(cxxopts)

// Add Google Test
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.14.0
)
FetchContent_MakeAvailable(googletest)
```

#### Wednesday-Thursday: Core Models
```cpp
// backend/include/devtrack/models/Comment.h
#pragma once
#include <string>
#include <chrono>

namespace devtrack::models {

class Comment {
public:
    Comment() = default;
    Comment(int taskId, std::string content);
    
    [[nodiscard]] int getId() const { return id_; }
    [[nodiscard]] int getTaskId() const { return task_id_; }
    [[nodiscard]] const std::string& getContent() const { return content_; }
    [[nodiscard]] const auto& getCreatedDate() const { return created_date_; }
    [[nodiscard]] bool isEdited() const { return is_edited_; }
    
    void setId(int id) { id_ = id; }
    void setContent(std::string content) { 
        content_ = std::move(content);
        is_edited_ = true;
        updated_date_ = std::chrono::system_clock::now();
    }
    
private:
    int id_{0};
    int task_id_{0};
    std::string content_;
    std::chrono::system_clock::time_point created_date_{std::chrono::system_clock::now()};
    std::optional<std::chrono::system_clock::time_point> updated_date_;
    bool is_edited_{false};
};

} // namespace devtrack::models
```

```cpp
// backend/include/devtrack/models/Label.h
#pragma once
#include <string>

namespace devtrack::models {

class Label {
public:
    Label() = default;
    Label(std::string name, std::string color = "");
    
    [[nodiscard]] int getId() const { return id_; }
    [[nodiscard]] const std::string& getName() const { return name_; }
    [[nodiscard]] const std::string& getColor() const { return color_; }
    
    void setId(int id) { id_ = id; }
    void setName(std::string name) { name_ = std::move(name); }
    void setColor(std::string color) { color_ = std::move(color); }
    
private:
    int id_{0};
    std::string name_;
    std::string color_;
};

} // namespace devtrack::models
```

#### Friday-Sunday: Repository Layer
```cpp
// backend/include/devtrack/database/CommentRepository.h
#pragma once
#include "../models/Comment.h"
#include <vector>
#include <optional>

namespace devtrack::database {

class Database;

class CommentRepository {
public:
    explicit CommentRepository(Database& db);
    
    std::optional<models::Comment> findById(int id);
    std::vector<models::Comment> findByTaskId(int taskId);
    std::vector<models::Comment> findAll();
    
    int create(const models::Comment& comment);
    bool update(const models::Comment& comment);
    bool remove(int id);
    
private:
    Database& db_;
};

} // namespace devtrack::database
```

---

### 2️⃣ Next Week (Week 2)

#### Services Layer
```cpp
// backend/include/devtrack/services/TaskService.h
#pragma once
#include "../models/Task.h"
#include <vector>
#include <optional>

namespace devtrack::services {

class TaskService {
public:
    explicit TaskService(database::TaskRepository& repo);
    
    // CRUD
    std::optional<models::Task> getTask(int id);
    std::vector<models::Task> getAllTasks();
    std::vector<models::Task> getTasksByProject(int projectId);
    std::vector<models::Task> getSubtasks(int parentTaskId);
    
    int createTask(const models::Task& task);
    bool updateTask(const models::Task& task);
    bool deleteTask(int id);
    
    // Business logic
    bool markAsCompleted(int id);
    bool updateProgress(int id, int progress);
    std::vector<models::Task> searchTasks(const std::string& query);
    std::vector<models::Task> getTasksDueToday();
    std::vector<models::Task> getOverdueTasks();
    
private:
    database::TaskRepository& repo_;
};

} // namespace devtrack::services
```

#### API Endpoints
```cpp
// backend/include/devtrack/api/TaskController.h
#pragma once
#include <crow.h>
#include "../services/TaskService.h"

namespace devtrack::api {

class TaskController {
public:
    explicit TaskController(services::TaskService& service);
    
    void registerRoutes(crow::SimpleApp& app);
    
private:
    crow::response getAllTasks();
    crow::response getTask(int id);
    crow::response createTask(const crow::request& req);
    crow::response updateTask(int id, const crow::request& req);
    crow::response deleteTask(int id);
    
    services::TaskService& service_;
};

} // namespace devtrack::api
```

---

## FILE STRUCTURE (Complete)

```
backend/
├── CMakeLists.txt
├── external/
│   └── CMakeLists.txt (add spdlog, cxxopts, googletest)
├── include/devtrack/
│   ├── core/
│   │   ├── Application.h
│   │   ├── Logger.h (NEW)
│   │   └── Config.h (NEW)
│   ├── models/
│   │   ├── Project.h ✅
│   │   ├── Task.h ✅
│   │   ├── Comment.h (NEW)
│   │   ├── Label.h (NEW)
│   │   ├── Attachment.h (NEW)
│   │   └── CustomField.h (NEW)
│   ├── database/
│   │   ├── Database.h ✅
│   │   ├── Migration.h (NEW)
│   │   ├── ProjectRepository.h ✅
│   │   ├── TaskRepository.h ✅
│   │   ├── CommentRepository.h (NEW)
│   │   ├── LabelRepository.h (NEW)
│   │   ├── AttachmentRepository.h (NEW)
│   │   └── CustomFieldRepository.h (NEW)
│   ├── services/
│   │   ├── ProjectService.h (NEW)
│   │   ├── TaskService.h (NEW)
│   │   ├── CommentService.h (NEW)
│   │   ├── LabelService.h (NEW)
│   │   └── SearchService.h (NEW)
│   ├── api/
│   │   ├── ApiRouter.h (NEW)
│   │   ├── ProjectController.h (NEW)
│   │   ├── TaskController.h (NEW)
│   │   ├── CommentController.h (NEW)
│   │   └── LabelController.h (NEW)
│   └── utils/
│       ├── JsonHelper.h (NEW)
│       └── DateHelper.h (NEW)
└── src/ (matching implementation files)
```

---

## SUCCESS METRICS (Solo User MVP)

### Must Have (Week 4)
- ✅ Can create projects and tasks
- ✅ Can organize tasks with statuses and priorities
- ✅ Can add comments to tasks
- ✅ Can attach files to tasks
- ✅ Can search for tasks
- ✅ Has list and board views
- ✅ Backend is fast (<100ms response time)
- ✅ Data persists correctly
- ✅ No crashes or data loss

### Should Have (Week 8)
- ✅ Can create subtasks
- ✅ Can track time spent
- ✅ Can set dependencies
- ✅ Can use templates
- ✅ Has gantt/timeline view
- ✅ Has custom fields
- ✅ Has keyboard shortcuts

---

**Ready to start coding?** Let's build Comment, Label, and Attachment models first!
