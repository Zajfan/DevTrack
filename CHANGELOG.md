# Changelog

All notable changes to DevTrack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

**TIER 2 Features - Task Dependencies (v0.4.0)**

- task_dependencies table with support for multiple dependency types
- TaskDependencyRepository with full CRUD operations
- Circular dependency detection using depth-first search algorithm
- Three dependency types: Blocks, Blocked By, Relates To
- DependencyManager component (268 lines) for managing task relationships
- Autocomplete search for selecting dependent tasks
- Visual dependency indicators with color-coded chips
- Integration in TaskDetail view with Dependencies button
- Dependency display with task titles and status
- IPC handlers for all dependency operations:
  - create, delete, findByTaskId, findByTaskIdWithDetails
  - getBlockingTasks, getBlockedTasks, hasBlockingDependencies
- Type-safe preload bridge for dependency operations
- Database indexes for performance (task_id, depends_on_task_id)

**TIER 2 Features - Custom Fields System (v0.3.0)**

- Custom field definitions with 6 field types: Text, Number, Date, Checkbox, Select, MultiSelect
- CustomFieldManager component for managing project-specific custom fields
- CustomFieldInput component for rendering appropriate input widgets per field type
- Custom field integration in task create/edit dialogs
- Custom field value storage and retrieval via IPC
- Required field support with validation
- Select/MultiSelect fields with JSON options storage
- Custom Fields button in ProjectDetail view
- Full CRUD operations for custom fields and task values
- Documentation: `docs/CUSTOM_FIELDS_GUIDE.md`

**TIER 2 Features - File Attachments (v0.2.0)**

- Native file upload with multi-file selection support
- File storage in userData/attachments directory
- MIME type detection based on file extensions
- Open attachments with system default application
- Delete attachments with automatic disk cleanup
- File metadata display (filename, size, uploader, upload date)
- File size formatting (B/KB/MB)
- File type icons (Image, PDF, generic File)
- Integration in TaskDetail view with empty state

**TIER 2 Features - Labels and Tags**

- LabelManager component for label CRUD operations
- Color-coded label system with visual indicators
- Click-to-toggle label assignment on tasks
- Label filtering dropdown in Tasks view
- Label chips on task cards in Board and List views
- Label display in TaskDetail view
- Sample labels included in seed data (Bug, Feature, Documentation, etc.)

**Database Enhancements**

- `custom_fields` table with JSON options storage
- `task_custom_values` junction table for custom field values
- `labels` and `task_labels` tables for tagging system
- `attachments` table with file metadata
- CASCADE delete for related data integrity

**IPC Handlers**

- `customField:create`, `findByProjectId`, `update`, `delete` - Field definition management
- `customField:setTaskValue`, `getTaskValue`, `getTaskValues`, `deleteTaskValue` - Task value operations
- `label:create`, `findByProjectId`, `findByTaskId`, `update`, `delete` - Label management
- `label:addToTask`, `removeFromTask` - Label assignment
- `file:upload`, `file:open`, `file:deleteWithCleanup` - File operations

**UI Components**

- CustomFieldManager dialog (347 lines) - Full CRUD UI for custom fields
- CustomFieldInput component (135 lines) - Polymorphic input rendering
- LabelManager dialog (262 lines) - Label CRUD with color picker
- File attachment section in TaskDetail with upload/download/delete

**Developer Experience**

- Type-safe preload bridge for all new IPC operations
- TypeScript interfaces for CustomField, TaskCustomValue
- Comprehensive custom fields documentation
- Updated feature roadmap tracking

### Changed

- Tasks.tsx enhanced with custom field state management
- TaskDetail.tsx enhanced with file attachment UI
- ProjectDetail.tsx enhanced with Custom Fields button
- Preload script updated with new IPC method signatures
- Repository pattern extended for custom fields, labels, attachments

### Technical Improvements

- JSON serialization for Select/MultiSelect options
- File storage with timestamp-based unique naming
- Comma-separated value storage for MultiSelect fields
- Type guards for field type handling
- useEffect hooks for loading custom fields when dialogs open

---

## [0.1.0] - Previous Releases

### Added

- C++23 backend architecture
- Electron + React + TypeScript frontend
- SQLite database with project, task, and concept tables
- 5W1H conceptual framework integration
- REST API design
- Material-UI component library
- Dark/Light theme support
- Cross-platform support (Windows, macOS, Linux)

### Changed

- Migrated from C# MAUI to C++23 + Electron architecture
- Redesigned database schema for better performance
- Improved project structure for professional development

## [0.1.0] - 2024-11-14

### Added

- Initial project architecture
- Backend structure with CMake build system
- Frontend structure with Electron
- Comprehensive documentation
- Build scripts and CI/CD workflows

[Unreleased]: https://github.com/The-No-Hands-Company/DevTrack/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/The-No-Hands-Company/DevTrack/releases/tag/v0.1.0
