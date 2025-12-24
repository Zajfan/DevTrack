import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { ProjectRepository } from './repositories/ProjectRepository';
import { TaskRepository } from './repositories/TaskRepository';
import { CommentRepository } from './repositories/CommentRepository';
import { LabelRepository } from './repositories/LabelRepository';
import { AttachmentRepository } from './repositories/AttachmentRepository';
import { CustomFieldRepository } from './repositories/CustomFieldRepository';
import { UserRepository } from './repositories/UserRepository';
import { NotificationRepository } from './repositories/NotificationRepository';
import { TimeEntryRepository } from './repositories/TimeEntryRepository';
import { AutomationRuleRepository } from './repositories/AutomationRuleRepository';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'devtrack-secret-key-change-in-production';
const API_PORT = process.env.API_PORT || 3000;

export class ApiServer {
  private app: express.Application;
  private db: Database.Database;
  private projectRepo: ProjectRepository;
  private taskRepo: TaskRepository;
  private commentRepo: CommentRepository;
  private labelRepo: LabelRepository;
  private attachmentRepo: AttachmentRepository;
  private customFieldRepo: CustomFieldRepository;
  private userRepo: UserRepository;
  private notificationRepo: NotificationRepository;
  private timeEntryRepo: TimeEntryRepository;
  private automationRuleRepo: AutomationRuleRepository;

  constructor(db: Database.Database) {
    this.app = express();
    this.db = db;
    
    // Initialize repositories
    this.projectRepo = new ProjectRepository(db);
    this.taskRepo = new TaskRepository(db);
    this.commentRepo = new CommentRepository(db);
    this.labelRepo = new LabelRepository(db);
    this.attachmentRepo = new AttachmentRepository(db);
    this.customFieldRepo = new CustomFieldRepository(db);
    this.userRepo = new UserRepository(db);
    this.notificationRepo = new NotificationRepository(db);
    this.timeEntryRepo = new TimeEntryRepository(db);
    this.automationRuleRepo = new AutomationRuleRepository(db);
    
    this.setupMiddleware();
    this.setupSwagger();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // Security
    this.app.use(helmet());
    this.app.use(cors());
    
    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
    });
    this.app.use('/api/', limiter);
  }

  private setupSwagger() {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'DevTrack API',
          version: '1.0.0',
          description: 'REST API for DevTrack Project Management System',
          contact: {
            name: 'DevTrack',
          },
        },
        servers: [
          {
            url: `http://localhost:${API_PORT}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      apis: ['./src/main/ApiServer.ts'],
    };

    const swaggerDocs = swaggerJsDoc(swaggerOptions);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
  }

  private authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const user = jwt.verify(token, JWT_SECRET);
      (req as any).user = user;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Authentication routes
    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     summary: Login user
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               username:
     *                 type: string
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Login successful
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 token:
     *                   type: string
     *                 user:
     *                   type: object
     */
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        
        // For demo purposes, accept any username with password "password"
        // In production, verify against database with hashed passwords
        if (!username || password !== 'password') {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ username, userId: 1 }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: 1, username } });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Project routes
    /**
     * @swagger
     * /api/projects:
     *   get:
     *     summary: Get all projects
     *     tags: [Projects]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of projects
     */
    this.app.get('/api/projects', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const projects = await Promise.resolve(this.projectRepo.findAll());
        res.json(projects);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/projects/:id', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const project = await Promise.resolve(this.projectRepo.findById(parseInt(req.params.id)));
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/projects', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const project = await Promise.resolve(this.projectRepo.create(req.body));
        res.status(201).json(project);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.put('/api/projects/:id', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const project = await Promise.resolve(this.projectRepo.update(parseInt(req.params.id), req.body));
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.delete('/api/projects/:id', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const success = await Promise.resolve(this.projectRepo.delete(parseInt(req.params.id)));
        if (!success) {
          return res.status(404).json({ error: 'Project not found' });
        }
        res.status(204).send();
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Task routes
    this.app.get('/api/tasks', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
        const tasks = projectId
          ? await Promise.resolve(this.taskRepo.findByProjectId(projectId))
          : [];
        res.json(tasks);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/tasks/:id', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const task = await Promise.resolve(this.taskRepo.findById(parseInt(req.params.id)));
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/tasks', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const task = await Promise.resolve(this.taskRepo.create(req.body));
        res.status(201).json(task);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.put('/api/tasks/:id', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const task = await Promise.resolve(this.taskRepo.update(parseInt(req.params.id), req.body));
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.delete('/api/tasks/:id', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const success = await Promise.resolve(this.taskRepo.delete(parseInt(req.params.id)));
        if (!success) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.status(204).send();
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Comment routes
    this.app.get('/api/tasks/:taskId/comments', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const comments = await Promise.resolve(this.commentRepo.findByTaskId(parseInt(req.params.taskId)));
        res.json(comments);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/tasks/:taskId/comments', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const comment = await Promise.resolve(this.commentRepo.create({
          ...req.body,
          taskId: parseInt(req.params.taskId),
        }));
        res.status(201).json(comment);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // User routes
    this.app.get('/api/users', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const users = await Promise.resolve(this.userRepo.findAll());
        res.json(users);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Notification routes
    this.app.get('/api/notifications', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const userId = (req as any).user.userId;
        const notifications = await Promise.resolve(this.notificationRepo.findByUserId(userId));
        res.json(notifications);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Time entry routes
    this.app.get('/api/time-entries', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
        const entries = taskId
          ? await Promise.resolve(this.timeEntryRepo.findByTaskId(taskId))
          : [];
        res.json(entries);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/time-entries', this.authenticateToken.bind(this), async (req, res) => {
      try {
        const entry = await Promise.resolve(this.timeEntryRepo.create(req.body));
        res.status(201).json(entry);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });
  }

  public start() {
    this.app.listen(API_PORT, () => {
      console.log(`DevTrack API Server running on http://localhost:${API_PORT}`);
      console.log(`API Documentation available at http://localhost:${API_PORT}/api-docs`);
    });
  }

  public getApp() {
    return this.app;
  }
}
