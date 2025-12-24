#!/usr/bin/env node

/**
 * scan-projects.ts
 * 
 * CLI script for scanning and importing projects from a directory.
 * 
 * Usage:
 *   npm run scan-projects -- --path /path/to/projects [options]
 * 
 * Examples:
 *   npm run scan-projects -- --path /run/media/zajferx/Data/dev
 *   npm run scan-projects -- --path /run/media/zajferx/Data/dev/The-No-hands-Company/projects --preview
 *   npm run scan-projects -- --path ~/dev --max-depth 2 --skip-existing
 */

import * as path from 'path';
import * as os from 'os';
import Database from 'better-sqlite3';
import { DirectoryScanner } from '../utils/DirectoryScanner';
import { ProjectStatus } from '../models/Project';

interface CliArgs {
  path?: string;
  maxDepth?: number;
  preview?: boolean;
  skipExisting?: boolean;
  includeHidden?: boolean;
  status?: string;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--path':
      case '-p':
        args.path = next;
        i++;
        break;
      case '--max-depth':
      case '-d':
        args.maxDepth = parseInt(next, 10);
        i++;
        break;
      case '--preview':
        args.preview = true;
        break;
      case '--skip-existing':
      case '-s':
        args.skipExisting = true;
        break;
      case '--include-hidden':
        args.includeHidden = true;
        break;
      case '--status':
        args.status = next;
        i++;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
DevTrack Project Scanner
=========================

Scan directories and import projects into DevTrack.

Usage:
  npm run scan-projects -- --path <directory> [options]

Options:
  --path, -p <path>         Directory to scan (required)
  --max-depth, -d <number>  Maximum directory depth (default: 3)
  --preview                 Preview results without importing
  --skip-existing, -s       Skip projects that already exist
  --include-hidden          Include hidden directories (starting with .)
  --status <status>         Default project status (active, on_hold, completed, archived)
  --help, -h                Show this help message

Examples:
  # Scan and preview your dev directory
  npm run scan-projects -- --path /run/media/zajferx/Data/dev --preview

  # Import all projects from The-No-hands-Company
  npm run scan-projects -- --path /run/media/zajferx/Data/dev/The-No-hands-Company/projects

  # Scan with max depth of 2, skipping existing projects
  npm run scan-projects -- --path ~/dev --max-depth 2 --skip-existing

  # Import as archived projects
  npm run scan-projects -- --path /old-projects --status archived

Detected Project Types:
  - git      (has .git directory)
  - npm      (has package.json)
  - cargo    (has Cargo.toml)
  - python   (has setup.py, pyproject.toml, or requirements.txt)
  - go       (has go.mod)
  - maven    (has pom.xml)
  - dotnet   (has .csproj or .sln)
  - cpp      (has CMakeLists.txt or Makefile)
  - folder   (generic directory)

The scanner will:
  1. Recursively scan the specified directory
  2. Detect project types based on files present
  3. Extract descriptions from README or package.json
  4. Calculate project size and file counts
  5. Import projects into DevTrack database

Project metadata will be stored in 5W1H format:
  - What: Project type and file count
  - How: Detected languages/technologies
  - Where: Full file system path
  - With What: Total project size
  - When: Last modification date
  - Why: README content or description

Note: This is a personal utility for bulk importing existing projects.
`);
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.path) {
    console.error('Error: --path is required');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  const fs = require('fs');
  if (!fs.existsSync(args.path)) {
    console.error(`Error: Path does not exist: ${args.path}`);
    process.exit(1);
  }

  const stat = fs.statSync(args.path);
  if (!stat.isDirectory()) {
    console.error(`Error: Path is not a directory: ${args.path}`);
    process.exit(1);
  }

  // Initialize database directly (not through Electron)
  const dbPath = path.join(os.homedir(), '.config', 'DevTrack', 'devtrack.db');
  const dbDir = path.dirname(dbPath);
  
  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`Using database: ${dbPath}`);
  const db = new Database(dbPath);

  const scanner = new DirectoryScanner(db);

  const scanOptions = {
    basePath: args.path,
    maxDepth: args.maxDepth || 3,
    includeHidden: args.includeHidden || false,
  };

  // Determine project status
  let defaultStatus = ProjectStatus.Active;
  if (args.status) {
    const statusMap: Record<string, ProjectStatus> = {
      'active': ProjectStatus.Active,
      'on_hold': ProjectStatus.OnHold,
      'completed': ProjectStatus.Completed,
      'archived': ProjectStatus.Archived,
    };
    defaultStatus = statusMap[args.status.toLowerCase()] || ProjectStatus.Active;
  }

  try {
    if (args.preview) {
      // Preview mode - just show what would be imported
      console.log('PREVIEW MODE - No changes will be made\n');
      await scanner.previewScan(scanOptions);
    } else {
      // Import mode
      const result = await scanner.scanAndImport({
        ...scanOptions,
        defaultStatus,
        skipExisting: args.skipExisting !== false, // Default to true
      });

      console.log('\n=== Import Summary ===');
      console.log(`Projects found: ${result.scanned}`);
      console.log(`Projects imported: ${result.imported}`);
      console.log(`Projects skipped: ${result.scanned - result.imported}`);

      if (result.imported > 0) {
        console.log('\n✅ Projects successfully imported into DevTrack!');
        console.log('   Launch DevTrack to view your projects.');
      }
    }

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during scan/import:', error);
    db.close();
    process.exit(1);
  }
}

main();
