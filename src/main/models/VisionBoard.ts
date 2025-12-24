/**
 * VisionBoard.ts
 * 
 * Models for visual project planning and mind mapping.
 * Vision boards allow users to create visual representations of project goals,
 * roadmaps, and ideas using a canvas-based interface.
 */

export enum VisionBoardType {
  Roadmap = 'roadmap',           // Timeline-based roadmap
  MindMap = 'mindmap',            // Hierarchical mind map
  Canvas = 'canvas',              // Free-form canvas
  Wireframe = 'wireframe',        // UI/UX wireframes
  Architecture = 'architecture',  // System architecture diagram
  UserFlow = 'userflow',          // User journey/flow diagram
  Custom = 'custom'               // Custom board type
}

export enum VisionBoardStatus {
  Draft = 'draft',
  Active = 'active',
  Archived = 'archived'
}

export enum NodeType {
  Text = 'text',
  Image = 'image',
  Shape = 'shape',
  StickyNote = 'sticky_note',
  Icon = 'icon',
  Link = 'link',
  Task = 'task',          // Link to actual DevTrack task
  Milestone = 'milestone',
  Decision = 'decision',
  Process = 'process'
}

export enum ShapeType {
  Rectangle = 'rectangle',
  Circle = 'circle',
  Triangle = 'triangle',
  Diamond = 'diamond',
  Hexagon = 'hexagon',
  Arrow = 'arrow',
  Cloud = 'cloud',
  Star = 'star'
}

export enum LineType {
  Solid = 'solid',
  Dashed = 'dashed',
  Dotted = 'dotted',
  Arrow = 'arrow',
  DoubleArrow = 'double_arrow',
  Curved = 'curved'
}

/**
 * VisionBoard
 * Main vision board entity
 */
export interface VisionBoard {
  id: number;
  name: string;
  description: string | null;
  type: VisionBoardType;
  status: VisionBoardStatus;
  projectId: number | null;  // Optional link to project
  thumbnail: string | null;   // Base64 or URL
  canvasWidth: number;        // Canvas dimensions
  canvasHeight: number;
  backgroundColor: string;
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;
  zoom: number;
  viewportX: number;          // Current viewport position
  viewportY: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVisionBoardData {
  name: string;
  description?: string;
  type: VisionBoardType;
  projectId?: number | null;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  gridEnabled?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
}

export interface UpdateVisionBoardData {
  name?: string;
  description?: string;
  type?: VisionBoardType;
  status?: VisionBoardStatus;
  projectId?: number | null;
  thumbnail?: string | null;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  gridEnabled?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
  zoom?: number;
  viewportX?: number;
  viewportY?: number;
}

/**
 * VisionBoardNode
 * Individual element on the canvas
 */
export interface VisionBoardNode {
  id: number;
  boardId: number;
  type: NodeType;
  x: number;              // Position on canvas
  y: number;
  width: number;
  height: number;
  rotation: number;       // Rotation in degrees
  zIndex: number;         // Layer order
  locked: boolean;        // Prevent editing
  visible: boolean;
  
  // Content
  text: string | null;
  fontSize: number | null;
  fontFamily: string | null;
  fontWeight: string | null;
  textAlign: string | null;
  textColor: string | null;
  
  // Visual
  backgroundColor: string | null;
  borderColor: string | null;
  borderWidth: number | null;
  borderRadius: number | null;
  opacity: number;
  shadow: string | null;
  
  // Shape-specific
  shapeType: ShapeType | null;
  
  // Image-specific
  imageUrl: string | null;
  imageFit: string | null;  // 'cover', 'contain', 'fill'
  
  // Task link
  taskId: number | null;
  
  // Custom data
  metadata: Record<string, any> | null;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVisionBoardNodeData {
  boardId: number;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  locked?: boolean;
  visible?: boolean;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  shadow?: string;
  shapeType?: ShapeType;
  imageUrl?: string;
  imageFit?: string;
  taskId?: number;
  metadata?: Record<string, any>;
}

export interface UpdateVisionBoardNodeData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  locked?: boolean;
  visible?: boolean;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  shadow?: string;
  shapeType?: ShapeType;
  imageUrl?: string;
  imageFit?: string;
  taskId?: number;
  metadata?: Record<string, any>;
}

/**
 * VisionBoardConnection
 * Lines/arrows connecting nodes
 */
export interface VisionBoardConnection {
  id: number;
  boardId: number;
  fromNodeId: number;
  toNodeId: number;
  lineType: LineType;
  color: string;
  width: number;
  label: string | null;
  labelPosition: number;  // 0 = start, 0.5 = middle, 1 = end
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVisionBoardConnectionData {
  boardId: number;
  fromNodeId: number;
  toNodeId: number;
  lineType?: LineType;
  color?: string;
  width?: number;
  label?: string;
  labelPosition?: number;
  metadata?: Record<string, any>;
}

export interface UpdateVisionBoardConnectionData {
  fromNodeId?: number;
  toNodeId?: number;
  lineType?: LineType;
  color?: string;
  width?: number;
  label?: string;
  labelPosition?: number;
  metadata?: Record<string, any>;
}

/**
 * VisionBoardGroup
 * Groups of nodes (for organization)
 */
export interface VisionBoardGroup {
  id: number;
  boardId: number;
  name: string;
  color: string;
  nodeIds: number[];  // Array of node IDs in this group
  collapsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVisionBoardGroupData {
  boardId: number;
  name: string;
  color?: string;
  nodeIds: number[];
  collapsed?: boolean;
}

export interface UpdateVisionBoardGroupData {
  name?: string;
  color?: string;
  nodeIds?: number[];
  collapsed?: boolean;
}

/**
 * Default values
 */
export const DEFAULT_CANVAS_WIDTH = 4000;
export const DEFAULT_CANVAS_HEIGHT = 3000;
export const DEFAULT_GRID_SIZE = 20;
export const DEFAULT_BACKGROUND_COLOR = '#ffffff';
export const DEFAULT_ZOOM = 1.0;

export const DEFAULT_NODE_WIDTH = 200;
export const DEFAULT_NODE_HEIGHT = 100;
export const DEFAULT_FONT_SIZE = 14;
export const DEFAULT_FONT_FAMILY = 'Inter, sans-serif';
export const DEFAULT_BORDER_WIDTH = 2;
export const DEFAULT_BORDER_RADIUS = 8;

export const SHAPE_PRESETS: Record<ShapeType, Partial<VisionBoardNode>> = {
  [ShapeType.Rectangle]: {
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb'
  },
  [ShapeType.Circle]: {
    borderRadius: 999,
    backgroundColor: '#10b981',
    borderColor: '#059669'
  },
  [ShapeType.Triangle]: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706'
  },
  [ShapeType.Diamond]: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed'
  },
  [ShapeType.Hexagon]: {
    backgroundColor: '#ec4899',
    borderColor: '#db2777'
  },
  [ShapeType.Arrow]: {
    backgroundColor: '#14b8a6',
    borderColor: '#0d9488'
  },
  [ShapeType.Cloud]: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9'
  },
  [ShapeType.Star]: {
    backgroundColor: '#fbbf24',
    borderColor: '#f59e0b'
  }
};

export const STICKY_NOTE_COLORS = [
  '#fef3c7', // Yellow
  '#fecaca', // Red
  '#bfdbfe', // Blue
  '#bbf7d0', // Green
  '#e9d5ff', // Purple
  '#fed7aa', // Orange
  '#fbcfe8', // Pink
  '#ddd6fe'  // Indigo
];

/**
 * Template configurations
 */
export interface VisionBoardTemplate {
  name: string;
  description: string;
  type: VisionBoardType;
  nodes: Partial<CreateVisionBoardNodeData>[];
  connections: Partial<CreateVisionBoardConnectionData>[];
}

export const VISION_BOARD_TEMPLATES: VisionBoardTemplate[] = [
  {
    name: 'Product Roadmap',
    description: 'Timeline-based product development roadmap',
    type: VisionBoardType.Roadmap,
    nodes: [
      { type: NodeType.Milestone, x: 200, y: 200, text: 'Q1 2025' },
      { type: NodeType.Milestone, x: 600, y: 200, text: 'Q2 2025' },
      { type: NodeType.Milestone, x: 1000, y: 200, text: 'Q3 2025' },
      { type: NodeType.Milestone, x: 1400, y: 200, text: 'Q4 2025' }
    ],
    connections: []
  },
  {
    name: 'Mind Map',
    description: 'Hierarchical mind map for brainstorming',
    type: VisionBoardType.MindMap,
    nodes: [
      { type: NodeType.Shape, shapeType: ShapeType.Circle, x: 800, y: 400, text: 'Central Idea' },
      { type: NodeType.Shape, shapeType: ShapeType.Rectangle, x: 400, y: 200, text: 'Branch 1' },
      { type: NodeType.Shape, shapeType: ShapeType.Rectangle, x: 400, y: 600, text: 'Branch 2' },
      { type: NodeType.Shape, shapeType: ShapeType.Rectangle, x: 1200, y: 200, text: 'Branch 3' },
      { type: NodeType.Shape, shapeType: ShapeType.Rectangle, x: 1200, y: 600, text: 'Branch 4' }
    ],
    connections: []
  },
  {
    name: 'System Architecture',
    description: 'Technical system architecture diagram',
    type: VisionBoardType.Architecture,
    nodes: [
      { type: NodeType.Shape, shapeType: ShapeType.Rectangle, x: 400, y: 200, text: 'Frontend' },
      { type: NodeType.Shape, shapeType: ShapeType.Rectangle, x: 800, y: 200, text: 'Backend' },
      { type: NodeType.Shape, shapeType: ShapeType.Rectangle, x: 1200, y: 200, text: 'Database' }
    ],
    connections: []
  },
  {
    name: 'User Flow',
    description: 'User journey and interaction flow',
    type: VisionBoardType.UserFlow,
    nodes: [
      { type: NodeType.Shape, shapeType: ShapeType.Circle, x: 200, y: 400, text: 'Start' },
      { type: NodeType.Process, x: 500, y: 400, text: 'Sign Up' },
      { type: NodeType.Decision, x: 800, y: 400, text: 'Valid?' },
      { type: NodeType.Process, x: 1100, y: 400, text: 'Dashboard' }
    ],
    connections: []
  },
  {
    name: 'Blank Canvas',
    description: 'Empty canvas for free-form design',
    type: VisionBoardType.Canvas,
    nodes: [],
    connections: []
  }
];
