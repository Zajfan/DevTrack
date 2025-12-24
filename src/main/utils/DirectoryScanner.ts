/**
 * DirectoryScanner.ts
 * 
 * Personal utility for scanning directories and importing projects into DevTrack.
 * Scans a directory tree and creates DevTrack projects based on folder structure.
 * 
 * NOT FOR PRODUCTION - Personal development tool
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { ProjectStatus, CreateProjectData } from '../models/Project';

export interface ScanOptions {
  basePath: string;
  maxDepth?: number;
  includeHidden?: boolean;
  fileTypesFilter?: string[]; // e.g., ['.js', '.ts', '.md']
  excludeDirs?: string[]; // e.g., ['node_modules', '.git']
  detectProjectType?: boolean; // Detect by package.json, Cargo.toml, etc.
}

export interface ScannedProject {
  path: string;
  name: string;
  type: string; // 'folder', 'git', 'npm', 'cargo', 'python', etc.
  size: number; // Total size in bytes
  fileCount: number;
  lastModified: Date;
  description: string;
  detectedLanguages: string[];
  hasReadme: boolean;
  readmeContent?: string;
}

export class DirectoryScanner {
  constructor(private db: Database.Database) {}

  /**
   * Scan a directory and return potential projects
   */
  async scanDirectory(options: ScanOptions): Promise<ScannedProject[]> {
    const {
      basePath,
      maxDepth = 3,
      includeHidden = false,
      excludeDirs = ['node_modules', '.git', 'dist', 'build', 'target', '__pycache__', '.venv', 'venv'],
      detectProjectType = true,
    } = options;

    const projects: ScannedProject[] = [];

    const scanRecursive = (currentPath: string, depth: number): void => {
      if (depth > maxDepth) return;

      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!includeHidden && entry.name.startsWith('.')) continue;
          if (!entry.isDirectory()) continue;
          if (excludeDirs.includes(entry.name)) continue;

          const fullPath = path.join(currentPath, entry.name);

          // Check if this looks like a project directory
          const projectInfo = this.analyzeDirectory(fullPath, detectProjectType);

          if (projectInfo) {
            projects.push({
              path: fullPath,
              name: entry.name,
              ...projectInfo,
            });
          } else {
            // Recurse into subdirectories
            scanRecursive(fullPath, depth + 1);
          }
        }
      } catch (error) {
        console.error(`Error scanning ${currentPath}:`, error);
      }
    };

    scanRecursive(basePath, 0);
    return projects;
  }

  /**
   * Analyze a directory to determine if it's a project
   */
  private analyzeDirectory(dirPath: string, detectType: boolean): Omit<ScannedProject, 'path' | 'name'> | null {
    try {
      const files = fs.readdirSync(dirPath);

      // Project type detection
      let type = 'folder';
      const detectedLanguages: string[] = [];
      let hasReadme = false;
      let readmeContent: string | undefined;

      // Check for project markers
      if (files.includes('.git')) {
        type = 'git';
      }

      if (detectType) {
        // Node.js/npm project
        if (files.includes('package.json')) {
          type = 'npm';
          detectedLanguages.push('JavaScript/TypeScript');
        }

        // Rust project
        if (files.includes('Cargo.toml')) {
          type = 'cargo';
          detectedLanguages.push('Rust');
        }

        // Python project
        if (files.includes('setup.py') || files.includes('pyproject.toml') || files.includes('requirements.txt')) {
          type = 'python';
          detectedLanguages.push('Python');
        }

        // Go project
        if (files.includes('go.mod')) {
          type = 'go';
          detectedLanguages.push('Go');
        }

        // Java/Maven project
        if (files.includes('pom.xml')) {
          type = 'maven';
          detectedLanguages.push('Java');
        }

        // C#/.NET project
        if (files.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) {
          type = 'dotnet';
          detectedLanguages.push('C#');
        }

        // C++ project
        if (files.includes('CMakeLists.txt') || files.includes('Makefile')) {
          type = 'cpp';
          detectedLanguages.push('C++');
        }
      }

      // Look for README
      const readmeFile = files.find(f => f.toLowerCase().startsWith('readme'));
      if (readmeFile) {
        hasReadme = true;
        const readmePath = path.join(dirPath, readmeFile);
        try {
          readmeContent = fs.readFileSync(readmePath, 'utf-8');
          // Limit to first 500 chars
          if (readmeContent.length > 500) {
            readmeContent = readmeContent.substring(0, 500) + '...';
          }
        } catch {
          // Ignore read errors
        }
      }

      // Calculate directory size and file count
      const stats = this.getDirectoryStats(dirPath);

      // Only consider it a project if it has some substance
      if (stats.fileCount < 2 && !hasReadme && type === 'folder') {
        return null; // Skip trivial directories
      }

      // Extract description from README or package.json
      let description = `${type} project`;
      if (readmeContent) {
        // Try to extract first meaningful line
        const lines = readmeContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        if (lines.length > 0) {
          description = lines[0].trim();
        }
      } else if (type === 'npm') {
        try {
          const packageJson = JSON.parse(fs.readFileSync(path.join(dirPath, 'package.json'), 'utf-8'));
          description = packageJson.description || description;
        } catch {
          // Ignore parse errors
        }
      }

      const lastModified = fs.statSync(dirPath).mtime;

      return {
        type,
        size: stats.size,
        fileCount: stats.fileCount,
        lastModified,
        description,
        detectedLanguages,
        hasReadme,
        readmeContent,
      };
    } catch (error) {
      console.error(`Error analyzing ${dirPath}:`, error);
      return null;
    }
  }

  /**
   * Calculate total size and file count for a directory
   */
  private getDirectoryStats(dirPath: string): { size: number; fileCount: number } {
    let size = 0;
    let fileCount = 0;

    const traverse = (currentPath: string, depth: number): void => {
      if (depth > 5) return; // Prevent deep recursion

      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            // Skip common large directories
            if (['node_modules', '.git', 'dist', 'build', 'target'].includes(entry.name)) {
              continue;
            }
            traverse(fullPath, depth + 1);
          } else {
            try {
              const stats = fs.statSync(fullPath);
              size += stats.size;
              fileCount++;
            } catch {
              // Ignore stat errors
            }
          }
        }
      } catch (error) {
        // Ignore directory read errors
      }
    };

    traverse(dirPath, 0);
    return { size, fileCount };
  }

  /**
   * Import scanned projects into DevTrack database
   */
  importProjects(scannedProjects: ScannedProject[], options?: {
    defaultStatus?: ProjectStatus;
    skipExisting?: boolean;
  }): number {
    const { defaultStatus = ProjectStatus.Active, skipExisting = true } = options || {};

    let imported = 0;

    for (const project of scannedProjects) {
      try {
        // Check if project already exists by path
        if (skipExisting) {
          const existing = this.db.prepare(
            'SELECT id FROM projects WHERE concept_where = ?'
          ).get(project.path);

          if (existing) {
            console.log(`Skipping existing project: ${project.name}`);
            continue;
          }
        }

        // Create project
        const projectData: CreateProjectData = {
          name: project.name,
          description: project.description,
          status: defaultStatus,
          conceptWhat: `${project.type} project with ${project.fileCount} files`,
          conceptHow: project.detectedLanguages.length > 0
            ? `Built with ${project.detectedLanguages.join(', ')}`
            : 'Development project',
          conceptWhere: project.path,
          conceptWithWhat: `${this.formatBytes(project.size)} total size`,
          conceptWhen: `Last modified: ${project.lastModified.toLocaleDateString()}`,
          conceptWhy: project.readmeContent || `${project.type} development project`,
        };

        const stmt = this.db.prepare(`
          INSERT INTO projects (
            name, description, status, 
            concept_what, concept_how, concept_where, 
            concept_with_what, concept_when, concept_why
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          projectData.name,
          projectData.description,
          projectData.status,
          projectData.conceptWhat,
          projectData.conceptHow,
          projectData.conceptWhere,
          projectData.conceptWithWhat,
          projectData.conceptWhen,
          projectData.conceptWhy
        );

        imported++;
        console.log(`Imported: ${project.name} (${project.type})`);
      } catch (error) {
        console.error(`Error importing ${project.name}:`, error);
      }
    }

    return imported;
  }

  /**
   * Scan and import in one operation
   */
  async scanAndImport(options: ScanOptions & {
    defaultStatus?: ProjectStatus;
    skipExisting?: boolean;
  }): Promise<{ scanned: number; imported: number }> {
    console.log(`Scanning directory: ${options.basePath}...`);
    const scanned = await this.scanDirectory(options);
    console.log(`Found ${scanned.length} potential projects.`);

    console.log('Importing projects...');
    const imported = this.importProjects(scanned, {
      defaultStatus: options.defaultStatus,
      skipExisting: options.skipExisting,
    });

    console.log(`Import complete: ${imported} projects added.`);
    return { scanned: scanned.length, imported };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Preview scan results without importing
   */
  async previewScan(options: ScanOptions): Promise<void> {
    const projects = await this.scanDirectory(options);

    console.log('\n=== Scan Results ===');
    console.log(`Found ${projects.length} projects in ${options.basePath}\n`);

    for (const project of projects) {
      console.log(`📁 ${project.name}`);
      console.log(`   Type: ${project.type}`);
      console.log(`   Path: ${project.path}`);
      console.log(`   Files: ${project.fileCount}`);
      console.log(`   Size: ${this.formatBytes(project.size)}`);
      if (project.detectedLanguages.length > 0) {
        console.log(`   Languages: ${project.detectedLanguages.join(', ')}`);
      }
      if (project.hasReadme) {
        console.log(`   Has README: Yes`);
      }
      console.log(`   Description: ${project.description}`);
      console.log('');
    }
  }
}
