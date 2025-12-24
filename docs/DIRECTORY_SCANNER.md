# Directory Scanner - Personal Utility

**Purpose**: Bulk import existing projects from your file system into DevTrack.

**Status**: Personal development tool - NOT for production use

---

## Overview

The Directory Scanner is a command-line utility that scans your development directories and automatically imports them as projects into DevTrack. It's designed for personal use to quickly populate DevTrack with your existing projects without manual entry.

## Features

- **Automatic Project Detection**: Identifies project directories based on common markers (package.json, Cargo.toml, .git, etc.)
- **Language Detection**: Recognizes 8+ programming languages/project types
- **README Extraction**: Pulls descriptions from README files
- **Metadata Mapping**: Stores project info in DevTrack's 5W1H format
- **Smart Filtering**: Excludes common build directories (node_modules, dist, etc.)
- **Preview Mode**: See what would be imported without making changes
- **Duplicate Prevention**: Skip projects that are already in DevTrack

## Supported Project Types

The scanner automatically detects:

| Type | Indicator | Languages |
|------|-----------|-----------|
| **npm** | package.json | JavaScript/TypeScript |
| **cargo** | Cargo.toml | Rust |
| **python** | setup.py, pyproject.toml, requirements.txt | Python |
| **go** | go.mod | Go |
| **maven** | pom.xml | Java |
| **dotnet** | .csproj, .sln | C# |
| **cpp** | CMakeLists.txt, Makefile | C++ |
| **git** | .git directory | (any) |
| **folder** | Generic directory | (any) |

## Usage

### Basic Scan and Import

```bash
# Scan your entire dev directory
npm run scan-projects -- --path /run/media/zajferx/Data/dev

# Scan a specific organization
npm run scan-projects -- --path /run/media/zajferx/Data/dev/The-No-hands-Company/projects
```

### Preview Mode (Recommended First Time)

```bash
# Preview what would be imported (no changes)
npm run scan-projects -- --path /run/media/zajferx/Data/dev --preview
```

### Advanced Options

```bash
# Scan with maximum depth of 2 levels
npm run scan-projects -- --path ~/dev --max-depth 2

# Skip projects that already exist in DevTrack
npm run scan-projects -- --path ~/dev --skip-existing

# Import projects as archived
npm run scan-projects -- --path /old-projects --status archived

# Include hidden directories (starting with .)
npm run scan-projects -- --path ~/dev --include-hidden
```

## Command-Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--path <dir>` | `-p` | Directory to scan (required) | - |
| `--max-depth <n>` | `-d` | Maximum directory depth | 3 |
| `--preview` | - | Preview without importing | false |
| `--skip-existing` | `-s` | Skip existing projects | true |
| `--include-hidden` | - | Include hidden directories | false |
| `--status <status>` | - | Default project status | active |
| `--help` | `-h` | Show help message | - |

### Status Values

- `active` - Active projects (default)
- `on_hold` - Projects on hold
- `completed` - Completed projects
- `archived` - Archived projects

## How It Works

### 1. Directory Scanning

The scanner recursively walks through your directory tree:

```
/run/media/zajferx/Data/dev/
├── The-No-hands-Company/
│   └── projects/
│       ├── DevTrack/          ✅ Detected (npm, git)
│       ├── ProjectAlpha/      ✅ Detected (python)
│       └── OldStuff/          ✅ Detected (folder)
├── personal/
│   ├── website/               ✅ Detected (npm, git)
│   └── scripts/               ✅ Detected (folder)
└── archived/
    └── legacy-app/            ✅ Detected (java, maven)
```

### 2. Project Analysis

For each directory, it:

1. Checks for project markers (package.json, etc.)
2. Determines project type
3. Reads README for description
4. Counts files and calculates size
5. Detects programming languages
6. Records last modification date

### 3. Data Mapping (5W1H)

Projects are imported with metadata:

| Field | Mapping | Example |
|-------|---------|---------|
| **Name** | Directory name | "DevTrack" |
| **Description** | README first line or package.json description | "A concept-driven project management system" |
| **What** | Type and file count | "npm project with 247 files" |
| **How** | Detected languages | "Built with JavaScript/TypeScript" |
| **Where** | Full file path | "/run/media/zajferx/Data/dev/.../DevTrack" |
| **With What** | Project size | "15.3 MB total size" |
| **When** | Last modified | "Last modified: 11/17/2025" |
| **Why** | README content (truncated) | "DevTrack is a native desktop application..." |

### 4. Import

Projects are inserted into the database with:
- Unique constraint on `concept_where` (file path)
- Default status: Active
- Automatic ID assignment
- Timestamp tracking

## Examples

### Example 1: Preview Your Dev Directory

```bash
npm run scan-projects -- --path /run/media/zajferx/Data/dev --preview
```

**Output**:
```
PREVIEW MODE - No changes will be made

Scanning directory: /run/media/zajferx/Data/dev...
Found 23 potential projects.

=== Scan Results ===
Found 23 projects in /run/media/zajferx/Data/dev

📁 DevTrack
   Type: npm
   Path: /run/media/zajferx/Data/dev/The-No-hands-Company/projects/DevTrack
   Files: 247
   Size: 15.3 MB
   Languages: JavaScript/TypeScript
   Has README: Yes
   Description: A concept-driven project management system

📁 rust-game
   Type: cargo
   Path: /run/media/zajferx/Data/dev/personal/rust-game
   Files: 89
   Size: 2.1 MB
   Languages: Rust
   Has README: Yes
   Description: A simple game written in Rust

...
```

### Example 2: Import The-No-hands-Company Projects

```bash
npm run scan-projects -- --path /run/media/zajferx/Data/dev/The-No-hands-Company/projects
```

**Output**:
```
Scanning directory: /run/media/zajferx/Data/dev/The-No-hands-Company/projects...
Found 8 potential projects.
Importing projects...
Imported: DevTrack (npm)
Imported: ProjectAlpha (python)
Imported: WebsiteRevamp (npm)
Skipping existing project: LegacyApp
Imported: NewIdea (folder)
...
Import complete: 7 projects added.

=== Import Summary ===
Projects found: 8
Projects imported: 7
Projects skipped: 1

✅ Projects successfully imported into DevTrack!
   Launch DevTrack to view your projects.
```

### Example 3: Archive Old Projects

```bash
npm run scan-projects -- --path /run/media/zajferx/Data/dev/archived --status archived
```

## Excluded Directories

The scanner automatically skips common build/cache directories:

- `node_modules` - npm dependencies
- `.git` - Git internals
- `dist` - Build output
- `build` - Build output
- `target` - Rust build output
- `__pycache__` - Python cache
- `.venv`, `venv` - Python virtual environments

These can still be scanned if they contain project markers at their root level.

## Safety Features

### 1. Duplicate Prevention

By default, `--skip-existing` is enabled:

```sql
-- Checks for existing project with same path
SELECT id FROM projects WHERE concept_where = '/path/to/project'
```

### 2. Preview Mode

Always preview first:

```bash
npm run scan-projects -- --path /your/directory --preview
```

### 3. No Destructive Changes

The scanner only **inserts** projects, never modifies or deletes existing data.

### 4. Error Handling

- Gracefully handles permission errors
- Skips unreadable directories
- Continues on individual failures
- Logs errors without crashing

## Limitations

### Size Calculation

- Ignores `node_modules`, `.git`, `dist`, `build`, `target`
- Limits recursion depth to 5 levels
- May not reflect exact disk usage

### README Extraction

- Takes first 500 characters
- Prefers files starting with "readme" (case-insensitive)
- Falls back to package.json description for npm projects

### Language Detection

- Based on project markers, not file content
- May not detect multi-language projects accurately
- Reports primary detected language

## Integration with DevTrack

### Viewing Imported Projects

1. Launch DevTrack: `npm run dev`
2. Navigate to Projects view
3. Imported projects appear with:
   - Name from directory name
   - Description from README
   - Full file path in "Where" concept field
   - Project type in "What" concept field

### Editing Imported Projects

You can edit any imported project:

- Change name, description, status
- Update 5W1H concept fields
- Add tasks, labels, attachments
- Assign team members

### Finding Project Files

The full file path is stored in `concept_where`:

```typescript
// In DevTrack UI
const projectPath = project.conceptWhere;
// Example: "/run/media/zajferx/Data/dev/The-No-hands-Company/projects/DevTrack"
```

You can use this to:
- Open project in file manager
- Launch in VS Code
- Run build commands
- Access project documentation

## Best Practices

### 1. Preview First

Always run with `--preview` before importing:

```bash
npm run scan-projects -- --path ~/dev --preview
```

### 2. Start Small

Test with a small directory first:

```bash
npm run scan-projects -- --path ~/dev/single-project --preview
```

### 3. Use Max Depth

Limit depth for large directories:

```bash
npm run scan-projects -- --path ~/dev --max-depth 2
```

### 4. Skip Existing

Enable duplicate prevention:

```bash
npm run scan-projects -- --path ~/dev --skip-existing
```

### 5. Organize by Status

Import different types with appropriate status:

```bash
# Active projects
npm run scan-projects -- --path ~/dev/active --status active

# Archived projects
npm run scan-projects -- --path ~/dev/old --status archived
```

## Troubleshooting

### "Path does not exist"

**Problem**: Specified path not found

**Solution**:
```bash
# Check path exists
ls -la /your/path

# Use absolute paths
npm run scan-projects -- --path /full/absolute/path
```

### "No projects found"

**Problem**: Scanner didn't detect any projects

**Solutions**:
1. Lower max depth: `--max-depth 1`
2. Include hidden: `--include-hidden`
3. Check if directory has project markers (package.json, etc.)

### "Permission denied"

**Problem**: Can't read directory

**Solution**:
```bash
# Check permissions
ls -la /path/to/directory

# Run with appropriate permissions
sudo npm run scan-projects -- --path /protected/directory
```

### Projects Already Exist

**Problem**: "Skipping existing project" messages

**Solutions**:
- This is normal with `--skip-existing` (default)
- To re-import, remove from DevTrack first
- Or manually delete from database:
  ```sql
  DELETE FROM projects WHERE concept_where = '/path/to/project';
  ```

## Advanced Usage

### Programmatic Use

You can use the DirectoryScanner class directly:

```typescript
import { getDatabase } from './database/Database';
import { DirectoryScanner } from './utils/DirectoryScanner';

const database = getDatabase();
database.initialize();
const db = database.getDb();

const scanner = new DirectoryScanner(db);

// Scan
const projects = await scanner.scanDirectory({
  basePath: '/your/path',
  maxDepth: 3,
  includeHidden: false,
});

// Import
const count = scanner.importProjects(projects, {
  defaultStatus: ProjectStatus.Active,
  skipExisting: true,
});

console.log(`Imported ${count} projects`);
```

### Custom Filtering

Modify DirectoryScanner.ts to add custom logic:

```typescript
// In analyzeDirectory method
if (dirPath.includes('test') || dirPath.includes('demo')) {
  return null; // Skip test/demo directories
}
```

### Custom Project Types

Add more project type detection:

```typescript
// Ruby on Rails
if (files.includes('Gemfile')) {
  type = 'rails';
  detectedLanguages.push('Ruby');
}

// PHP/Composer
if (files.includes('composer.json')) {
  type = 'php';
  detectedLanguages.push('PHP');
}
```

## See Also

- [DevTrack Main Documentation](../README.md)
- [Implementation Analysis](./COMPLETE_IMPLEMENTATION_ANALYSIS.md)
- [Project Models](../src/main/models/Project.ts)

---

**Note**: This is a personal development tool. Use with caution and always preview before importing large directory trees.
