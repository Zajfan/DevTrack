import { ipcMain } from 'electron';
import { getDatabase } from '../database/Database';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { TaskRepository } from '../repositories/TaskRepository';
import { LabelRepository } from '../repositories/LabelRepository';
import { ProjectStatus } from '../models/Project';
import { TaskStatus, TaskPriority } from '../models/Task';

/**
 * Test database operations by creating sample data
 */
export async function seedDatabase() {
  console.log('Seeding database with sample data...');
  
  const db = getDatabase().getDb();
  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const labelRepo = new LabelRepository(db);

  try {
    // Create a sample project
    const sampleProject = projectRepo.create({
      name: 'DevTrack Migration',
      description: 'Migrate from C++23 to TypeScript',
      status: ProjectStatus.Active,
      color: '#4CAF50',
      icon: '🚀',
      conceptWhat: 'A native desktop project management tool built with Electron and TypeScript',
      conceptHow: 'Using better-sqlite3 for database, React for UI, and IPC for communication',
      conceptWhere: 'Desktop application (Windows, Mac, Linux)',
      conceptWithWhat: 'Electron, TypeScript, React, Material-UI, better-sqlite3',
      conceptWhen: 'Q4 2024 - Initial development and testing',
      conceptWhy: 'To provide a fast, native, and extensible project management solution'
    });

    console.log('✅ Sample project created:', sampleProject);

    // Create sample tasks in different statuses
    const sampleTasks = [
      {
        title: 'Implement Kanban Board View',
        description: 'Create drag-and-drop Kanban board with columns for each task status',
        status: TaskStatus.InProgress,
        priority: TaskPriority.High,
      },
      {
        title: 'Add Task Creation Form',
        description: 'Modal dialog with form fields for creating new tasks',
        status: TaskStatus.Todo,
        priority: TaskPriority.High,
      },
      {
        title: 'Implement Comments System',
        description: 'Add ability to comment on tasks with threaded discussions',
        status: TaskStatus.Todo,
        priority: TaskPriority.Medium,
      },
      {
        title: 'Database Schema Design',
        description: 'Design SQLite schema with 8 tables and proper indexes',
        status: TaskStatus.Done,
        priority: TaskPriority.Critical,
      },
      {
        title: 'Setup TypeScript Project',
        description: 'Configure TypeScript, esbuild, and Electron build system',
        status: TaskStatus.Done,
        priority: TaskPriority.Critical,
      },
      {
        title: 'Code Review - IPC Handlers',
        description: 'Review all 30+ IPC handlers for security and performance',
        status: TaskStatus.Review,
        priority: TaskPriority.Medium,
      },
      {
        title: 'Fix Build on Windows',
        description: 'better-sqlite3 compilation issues on Windows platform',
        status: TaskStatus.Blocked,
        priority: TaskPriority.High,
      },
    ];

    for (const taskData of sampleTasks) {
      taskRepo.create({
        projectId: sampleProject.id,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assignedTo: undefined,
        dueDate: undefined,
        position: 0,
      });
    }

    console.log(`✅ Created ${sampleTasks.length} sample tasks`);

    // Create sample labels
    const sampleLabels = [
      { name: 'Bug', color: '#F44336', description: 'Something isn\'t working' },
      { name: 'Feature', color: '#2196F3', description: 'New feature or enhancement' },
      { name: 'Documentation', color: '#9C27B0', description: 'Documentation improvements' },
      { name: 'Performance', color: '#FF9800', description: 'Performance optimization' },
      { name: 'UI/UX', color: '#E91E63', description: 'User interface and experience' },
      { name: 'Backend', color: '#607D8B', description: 'Backend/database work' },
      { name: 'Urgent', color: '#D32F2F', description: 'Requires immediate attention' },
    ];

    const createdLabels = [];
    for (const labelData of sampleLabels) {
      const label = labelRepo.create({
        projectId: sampleProject.id,
        name: labelData.name,
        color: labelData.color,
        description: labelData.description,
      });
      createdLabels.push(label);
    }

    console.log(`✅ Created ${sampleLabels.length} sample labels`);

    // Add some labels to tasks
    const tasks = taskRepo.findByProjectId(sampleProject.id);
    if (tasks.length > 0 && createdLabels.length > 0) {
      // Task 0: Kanban Board - Feature, UI/UX
      labelRepo.addToTask(tasks[0].id, createdLabels[1].id); // Feature
      labelRepo.addToTask(tasks[0].id, createdLabels[4].id); // UI/UX
      
      // Task 1: Task Creation - Feature, UI/UX
      labelRepo.addToTask(tasks[1].id, createdLabels[1].id); // Feature
      labelRepo.addToTask(tasks[1].id, createdLabels[4].id); // UI/UX
      
      // Task 2: Comments - Feature, Backend
      labelRepo.addToTask(tasks[2].id, createdLabels[1].id); // Feature
      labelRepo.addToTask(tasks[2].id, createdLabels[5].id); // Backend
      
      // Task 3: Database Schema - Backend
      labelRepo.addToTask(tasks[3].id, createdLabels[5].id); // Backend
      
      // Task 4: TypeScript Setup - Documentation
      labelRepo.addToTask(tasks[4].id, createdLabels[2].id); // Documentation
      
      // Task 6: Windows Build - Bug, Urgent
      labelRepo.addToTask(tasks[6].id, createdLabels[0].id); // Bug
      labelRepo.addToTask(tasks[6].id, createdLabels[6].id); // Urgent
      
      console.log('✅ Added labels to tasks');
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    return false;
  }
}

/**
 * IPC handler to test database connection
 */
ipcMain.handle('test:database', async () => {
  try {
    const db = getDatabase().getDb();
    const projectRepo = new ProjectRepository(db);
    const projects = projectRepo.findAll();
    
    return {
      success: true,
      projectCount: projects.length,
      projects: projects
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});
