/**
 * VisionBoardManager.ts
 * 
 * Service for managing vision boards, nodes, connections, and groups.
 * Handles visual project planning and canvas-based design.
 */

import Database from 'better-sqlite3';
import {
  VisionBoard,
  VisionBoardNode,
  VisionBoardConnection,
  VisionBoardGroup,
  VisionBoardType,
  VisionBoardStatus,
  NodeType,
  ShapeType,
  LineType,
  CreateVisionBoardData,
  UpdateVisionBoardData,
  CreateVisionBoardNodeData,
  UpdateVisionBoardNodeData,
  CreateVisionBoardConnectionData,
  UpdateVisionBoardConnectionData,
  CreateVisionBoardGroupData,
  UpdateVisionBoardGroupData,
  VisionBoardTemplate,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_GRID_SIZE,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_ZOOM,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  DEFAULT_BORDER_WIDTH,
  DEFAULT_BORDER_RADIUS
} from '../models/VisionBoard';

export class VisionBoardManager {
  constructor(private db: Database.Database) {
    // Tables will be initialized explicitly after main database initialization
  }

  /**
   * Initialize database tables (call this after main database is initialized)
   */
  public initializeTables(): void {
    // Vision boards table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vision_boards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL CHECK(type IN ('roadmap', 'mindmap', 'canvas', 'wireframe', 'architecture', 'userflow', 'custom')),
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'archived')),
        project_id INTEGER,
        thumbnail TEXT,
        canvas_width INTEGER NOT NULL DEFAULT ${DEFAULT_CANVAS_WIDTH},
        canvas_height INTEGER NOT NULL DEFAULT ${DEFAULT_CANVAS_HEIGHT},
        background_color TEXT NOT NULL DEFAULT '${DEFAULT_BACKGROUND_COLOR}',
        grid_enabled INTEGER NOT NULL DEFAULT 1,
        grid_size INTEGER NOT NULL DEFAULT ${DEFAULT_GRID_SIZE},
        snap_to_grid INTEGER NOT NULL DEFAULT 1,
        zoom REAL NOT NULL DEFAULT ${DEFAULT_ZOOM},
        viewport_x REAL NOT NULL DEFAULT 0,
        viewport_y REAL NOT NULL DEFAULT 0,
        created_by INTEGER NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      )
    `);

    // Vision board nodes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vision_board_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('text', 'image', 'shape', 'sticky_note', 'icon', 'link', 'task', 'milestone', 'decision', 'process')),
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL NOT NULL DEFAULT ${DEFAULT_NODE_WIDTH},
        height REAL NOT NULL DEFAULT ${DEFAULT_NODE_HEIGHT},
        rotation REAL NOT NULL DEFAULT 0,
        z_index INTEGER NOT NULL DEFAULT 0,
        locked INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1,
        
        -- Content
        text TEXT,
        font_size INTEGER DEFAULT ${DEFAULT_FONT_SIZE},
        font_family TEXT DEFAULT '${DEFAULT_FONT_FAMILY}',
        font_weight TEXT DEFAULT 'normal',
        text_align TEXT DEFAULT 'center',
        text_color TEXT DEFAULT '#000000',
        
        -- Visual
        background_color TEXT,
        border_color TEXT,
        border_width INTEGER DEFAULT ${DEFAULT_BORDER_WIDTH},
        border_radius INTEGER DEFAULT ${DEFAULT_BORDER_RADIUS},
        opacity REAL NOT NULL DEFAULT 1.0,
        shadow TEXT,
        
        -- Shape-specific
        shape_type TEXT CHECK(shape_type IN ('rectangle', 'circle', 'triangle', 'diamond', 'hexagon', 'arrow', 'cloud', 'star')),
        
        -- Image-specific
        image_url TEXT,
        image_fit TEXT CHECK(image_fit IN ('cover', 'contain', 'fill')),
        
        -- Task link
        task_id INTEGER,
        
        -- Custom data
        metadata TEXT,  -- JSON
        
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (board_id) REFERENCES vision_boards(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
      )
    `);

    // Vision board connections table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vision_board_connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board_id INTEGER NOT NULL,
        from_node_id INTEGER NOT NULL,
        to_node_id INTEGER NOT NULL,
        line_type TEXT NOT NULL DEFAULT 'solid' CHECK(line_type IN ('solid', 'dashed', 'dotted', 'arrow', 'double_arrow', 'curved')),
        color TEXT NOT NULL DEFAULT '#000000',
        width INTEGER NOT NULL DEFAULT 2,
        label TEXT,
        label_position REAL NOT NULL DEFAULT 0.5,
        metadata TEXT,  -- JSON
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (board_id) REFERENCES vision_boards(id) ON DELETE CASCADE,
        FOREIGN KEY (from_node_id) REFERENCES vision_board_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (to_node_id) REFERENCES vision_board_nodes(id) ON DELETE CASCADE
      )
    `);

    // Vision board groups table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vision_board_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#e5e7eb',
        node_ids TEXT NOT NULL,  -- JSON array of node IDs
        collapsed INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (board_id) REFERENCES vision_boards(id) ON DELETE CASCADE
      )
    `);

    // Indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_vision_boards_project ON vision_boards(project_id);
      CREATE INDEX IF NOT EXISTS idx_vision_boards_created_by ON vision_boards(created_by);
      CREATE INDEX IF NOT EXISTS idx_vision_board_nodes_board ON vision_board_nodes(board_id);
      CREATE INDEX IF NOT EXISTS idx_vision_board_nodes_task ON vision_board_nodes(task_id);
      CREATE INDEX IF NOT EXISTS idx_vision_board_connections_board ON vision_board_connections(board_id);
      CREATE INDEX IF NOT EXISTS idx_vision_board_groups_board ON vision_board_groups(board_id);
    `);
  }

  // ==================== Vision Boards ====================

  /**
   * Create a new vision board
   */
  createBoard(data: CreateVisionBoardData, userId: number): VisionBoard {
    const stmt = this.db.prepare(`
      INSERT INTO vision_boards (
        name, description, type, project_id, canvas_width, canvas_height,
        background_color, grid_enabled, grid_size, snap_to_grid, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.description || null,
      data.type,
      data.projectId || null,
      data.canvasWidth || DEFAULT_CANVAS_WIDTH,
      data.canvasHeight || DEFAULT_CANVAS_HEIGHT,
      data.backgroundColor || DEFAULT_BACKGROUND_COLOR,
      data.gridEnabled !== false ? 1 : 0,
      data.gridSize || DEFAULT_GRID_SIZE,
      data.snapToGrid !== false ? 1 : 0,
      userId
    );

    return this.getBoardById(result.lastInsertRowid as number)!;
  }

  /**
   * Create board from template
   */
  createBoardFromTemplate(
    template: VisionBoardTemplate,
    name: string,
    userId: number,
    projectId?: number
  ): { board: VisionBoard; nodes: VisionBoardNode[]; connections: VisionBoardConnection[] } {
    const board = this.createBoard(
      {
        name,
        description: template.description,
        type: template.type,
        projectId
      },
      userId
    );

    const nodes: VisionBoardNode[] = [];
    const connections: VisionBoardConnection[] = [];

    // Create nodes
    for (const nodeData of template.nodes) {
      const node = this.createNode({
        boardId: board.id,
        type: nodeData.type || NodeType.Shape,
        x: nodeData.x || 0,
        y: nodeData.y || 0,
        width: nodeData.width || DEFAULT_NODE_WIDTH,
        height: nodeData.height || DEFAULT_NODE_HEIGHT,
        text: nodeData.text,
        shapeType: nodeData.shapeType
      });
      nodes.push(node);
    }

    // Create connections
    for (const connData of template.connections) {
      if (connData.fromNodeId !== undefined && connData.toNodeId !== undefined) {
        const conn = this.createConnection({
          boardId: board.id,
          fromNodeId: nodes[connData.fromNodeId].id,
          toNodeId: nodes[connData.toNodeId].id,
          lineType: connData.lineType,
          color: connData.color,
          label: connData.label
        });
        connections.push(conn);
      }
    }

    return { board, nodes, connections };
  }

  /**
   * Get vision board by ID
   */
  getBoardById(id: number): VisionBoard | null {
    const stmt = this.db.prepare('SELECT * FROM vision_boards WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToBoard(row) : null;
  }

  /**
   * Get all vision boards
   */
  getAllBoards(filters?: {
    type?: VisionBoardType;
    status?: VisionBoardStatus;
    projectId?: number;
    createdBy?: number;
  }): VisionBoard[] {
    let query = 'SELECT * FROM vision_boards WHERE 1=1';
    const params: any[] = [];

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.projectId !== undefined) {
      if (filters.projectId === null) {
        query += ' AND project_id IS NULL';
      } else {
        query += ' AND project_id = ?';
        params.push(filters.projectId);
      }
    }
    if (filters?.createdBy) {
      query += ' AND created_by = ?';
      params.push(filters.createdBy);
    }

    query += ' ORDER BY updated_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToBoard(row));
  }

  /**
   * Get boards for a project
   */
  getBoardsByProject(projectId: number): VisionBoard[] {
    return this.getAllBoards({ projectId });
  }

  /**
   * Update vision board
   */
  updateBoard(id: number, data: UpdateVisionBoardData): VisionBoard | null {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.type !== undefined) {
      updates.push('type = ?');
      params.push(data.type);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.projectId !== undefined) {
      updates.push('project_id = ?');
      params.push(data.projectId);
    }
    if (data.thumbnail !== undefined) {
      updates.push('thumbnail = ?');
      params.push(data.thumbnail);
    }
    if (data.canvasWidth !== undefined) {
      updates.push('canvas_width = ?');
      params.push(data.canvasWidth);
    }
    if (data.canvasHeight !== undefined) {
      updates.push('canvas_height = ?');
      params.push(data.canvasHeight);
    }
    if (data.backgroundColor !== undefined) {
      updates.push('background_color = ?');
      params.push(data.backgroundColor);
    }
    if (data.gridEnabled !== undefined) {
      updates.push('grid_enabled = ?');
      params.push(data.gridEnabled ? 1 : 0);
    }
    if (data.gridSize !== undefined) {
      updates.push('grid_size = ?');
      params.push(data.gridSize);
    }
    if (data.snapToGrid !== undefined) {
      updates.push('snap_to_grid = ?');
      params.push(data.snapToGrid ? 1 : 0);
    }
    if (data.zoom !== undefined) {
      updates.push('zoom = ?');
      params.push(data.zoom);
    }
    if (data.viewportX !== undefined) {
      updates.push('viewport_x = ?');
      params.push(data.viewportX);
    }
    if (data.viewportY !== undefined) {
      updates.push('viewport_y = ?');
      params.push(data.viewportY);
    }

    if (updates.length === 0) {
      return this.getBoardById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE vision_boards SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...params);

    return this.getBoardById(id);
  }

  /**
   * Delete vision board
   */
  deleteBoard(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM vision_boards WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Duplicate vision board
   */
  duplicateBoard(id: number, newName: string, userId: number): VisionBoard | null {
    const original = this.getBoardById(id);
    if (!original) return null;

    // Create new board
    const newBoard = this.createBoard(
      {
        name: newName,
        description: original.description || undefined,
        type: original.type,
        projectId: original.projectId || undefined,
        canvasWidth: original.canvasWidth,
        canvasHeight: original.canvasHeight,
        backgroundColor: original.backgroundColor,
        gridEnabled: original.gridEnabled,
        gridSize: original.gridSize,
        snapToGrid: original.snapToGrid
      },
      userId
    );

    // Copy nodes
    const nodes = this.getNodesByBoard(id);
    const nodeIdMap = new Map<number, number>();

    for (const node of nodes) {
      const newNode = this.createNode({
        boardId: newBoard.id,
        type: node.type,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        rotation: node.rotation,
        zIndex: node.zIndex,
        text: node.text || undefined,
        fontSize: node.fontSize || undefined,
        fontFamily: node.fontFamily || undefined,
        backgroundColor: node.backgroundColor || undefined,
        borderColor: node.borderColor || undefined,
        shapeType: node.shapeType || undefined,
        imageUrl: node.imageUrl || undefined,
        taskId: node.taskId || undefined
      });
      nodeIdMap.set(node.id, newNode.id);
    }

    // Copy connections
    const connections = this.getConnectionsByBoard(id);
    for (const conn of connections) {
      const newFromId = nodeIdMap.get(conn.fromNodeId);
      const newToId = nodeIdMap.get(conn.toNodeId);
      if (newFromId && newToId) {
        this.createConnection({
          boardId: newBoard.id,
          fromNodeId: newFromId,
          toNodeId: newToId,
          lineType: conn.lineType,
          color: conn.color,
          width: conn.width,
          label: conn.label || undefined
        });
      }
    }

    // Copy groups
    const groups = this.getGroupsByBoard(id);
    for (const group of groups) {
      const newNodeIds = group.nodeIds
        .map(oldId => nodeIdMap.get(oldId))
        .filter((id): id is number => id !== undefined);
      
      if (newNodeIds.length > 0) {
        this.createGroup({
          boardId: newBoard.id,
          name: group.name,
          color: group.color,
          nodeIds: newNodeIds,
          collapsed: group.collapsed
        });
      }
    }

    return newBoard;
  }

  // ==================== Nodes ====================

  /**
   * Create a node
   */
  createNode(data: CreateVisionBoardNodeData): VisionBoardNode {
    const stmt = this.db.prepare(`
      INSERT INTO vision_board_nodes (
        board_id, type, x, y, width, height, rotation, z_index, locked, visible,
        text, font_size, font_family, font_weight, text_align, text_color,
        background_color, border_color, border_width, border_radius, opacity, shadow,
        shape_type, image_url, image_fit, task_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.boardId,
      data.type,
      data.x,
      data.y,
      data.width,
      data.height,
      data.rotation || 0,
      data.zIndex || 0,
      data.locked ? 1 : 0,
      data.visible !== false ? 1 : 0,
      data.text || null,
      data.fontSize || null,
      data.fontFamily || null,
      data.fontWeight || null,
      data.textAlign || null,
      data.textColor || null,
      data.backgroundColor || null,
      data.borderColor || null,
      data.borderWidth || null,
      data.borderRadius || null,
      data.opacity || 1.0,
      data.shadow || null,
      data.shapeType || null,
      data.imageUrl || null,
      data.imageFit || null,
      data.taskId || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    return this.getNodeById(result.lastInsertRowid as number)!;
  }

  /**
   * Get node by ID
   */
  getNodeById(id: number): VisionBoardNode | null {
    const stmt = this.db.prepare('SELECT * FROM vision_board_nodes WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToNode(row) : null;
  }

  /**
   * Get all nodes for a board
   */
  getNodesByBoard(boardId: number): VisionBoardNode[] {
    const stmt = this.db.prepare('SELECT * FROM vision_board_nodes WHERE board_id = ? ORDER BY z_index ASC');
    const rows = stmt.all(boardId);
    return rows.map(row => this.mapRowToNode(row));
  }

  /**
   * Update node
   */
  updateNode(id: number, data: UpdateVisionBoardNodeData): VisionBoardNode | null {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.x !== undefined) { updates.push('x = ?'); params.push(data.x); }
    if (data.y !== undefined) { updates.push('y = ?'); params.push(data.y); }
    if (data.width !== undefined) { updates.push('width = ?'); params.push(data.width); }
    if (data.height !== undefined) { updates.push('height = ?'); params.push(data.height); }
    if (data.rotation !== undefined) { updates.push('rotation = ?'); params.push(data.rotation); }
    if (data.zIndex !== undefined) { updates.push('z_index = ?'); params.push(data.zIndex); }
    if (data.locked !== undefined) { updates.push('locked = ?'); params.push(data.locked ? 1 : 0); }
    if (data.visible !== undefined) { updates.push('visible = ?'); params.push(data.visible ? 1 : 0); }
    if (data.text !== undefined) { updates.push('text = ?'); params.push(data.text); }
    if (data.fontSize !== undefined) { updates.push('font_size = ?'); params.push(data.fontSize); }
    if (data.fontFamily !== undefined) { updates.push('font_family = ?'); params.push(data.fontFamily); }
    if (data.fontWeight !== undefined) { updates.push('font_weight = ?'); params.push(data.fontWeight); }
    if (data.textAlign !== undefined) { updates.push('text_align = ?'); params.push(data.textAlign); }
    if (data.textColor !== undefined) { updates.push('text_color = ?'); params.push(data.textColor); }
    if (data.backgroundColor !== undefined) { updates.push('background_color = ?'); params.push(data.backgroundColor); }
    if (data.borderColor !== undefined) { updates.push('border_color = ?'); params.push(data.borderColor); }
    if (data.borderWidth !== undefined) { updates.push('border_width = ?'); params.push(data.borderWidth); }
    if (data.borderRadius !== undefined) { updates.push('border_radius = ?'); params.push(data.borderRadius); }
    if (data.opacity !== undefined) { updates.push('opacity = ?'); params.push(data.opacity); }
    if (data.shadow !== undefined) { updates.push('shadow = ?'); params.push(data.shadow); }
    if (data.shapeType !== undefined) { updates.push('shape_type = ?'); params.push(data.shapeType); }
    if (data.imageUrl !== undefined) { updates.push('image_url = ?'); params.push(data.imageUrl); }
    if (data.imageFit !== undefined) { updates.push('image_fit = ?'); params.push(data.imageFit); }
    if (data.taskId !== undefined) { updates.push('task_id = ?'); params.push(data.taskId); }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); params.push(JSON.stringify(data.metadata)); }

    if (updates.length === 0) {
      return this.getNodeById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`UPDATE vision_board_nodes SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    return this.getNodeById(id);
  }

  /**
   * Delete node
   */
  deleteNode(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM vision_board_nodes WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Bulk update node positions
   */
  bulkUpdateNodePositions(updates: Array<{ id: number; x: number; y: number }>): void {
    const stmt = this.db.prepare('UPDATE vision_board_nodes SET x = ?, y = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    
    const transaction = this.db.transaction(() => {
      for (const update of updates) {
        stmt.run(update.x, update.y, update.id);
      }
    });
    
    transaction();
  }

  // ==================== Connections ====================

  /**
   * Create a connection
   */
  createConnection(data: CreateVisionBoardConnectionData): VisionBoardConnection {
    const stmt = this.db.prepare(`
      INSERT INTO vision_board_connections (
        board_id, from_node_id, to_node_id, line_type, color, width, label, label_position, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.boardId,
      data.fromNodeId,
      data.toNodeId,
      data.lineType || LineType.Solid,
      data.color || '#000000',
      data.width || 2,
      data.label || null,
      data.labelPosition || 0.5,
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    return this.getConnectionById(result.lastInsertRowid as number)!;
  }

  /**
   * Get connection by ID
   */
  getConnectionById(id: number): VisionBoardConnection | null {
    const stmt = this.db.prepare('SELECT * FROM vision_board_connections WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToConnection(row) : null;
  }

  /**
   * Get all connections for a board
   */
  getConnectionsByBoard(boardId: number): VisionBoardConnection[] {
    const stmt = this.db.prepare('SELECT * FROM vision_board_connections WHERE board_id = ?');
    const rows = stmt.all(boardId);
    return rows.map(row => this.mapRowToConnection(row));
  }

  /**
   * Update connection
   */
  updateConnection(id: number, data: UpdateVisionBoardConnectionData): VisionBoardConnection | null {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.fromNodeId !== undefined) { updates.push('from_node_id = ?'); params.push(data.fromNodeId); }
    if (data.toNodeId !== undefined) { updates.push('to_node_id = ?'); params.push(data.toNodeId); }
    if (data.lineType !== undefined) { updates.push('line_type = ?'); params.push(data.lineType); }
    if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color); }
    if (data.width !== undefined) { updates.push('width = ?'); params.push(data.width); }
    if (data.label !== undefined) { updates.push('label = ?'); params.push(data.label); }
    if (data.labelPosition !== undefined) { updates.push('label_position = ?'); params.push(data.labelPosition); }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); params.push(JSON.stringify(data.metadata)); }

    if (updates.length === 0) {
      return this.getConnectionById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`UPDATE vision_board_connections SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    return this.getConnectionById(id);
  }

  /**
   * Delete connection
   */
  deleteConnection(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM vision_board_connections WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Groups ====================

  /**
   * Create a group
   */
  createGroup(data: CreateVisionBoardGroupData): VisionBoardGroup {
    const stmt = this.db.prepare(`
      INSERT INTO vision_board_groups (board_id, name, color, node_ids, collapsed)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.boardId,
      data.name,
      data.color || '#e5e7eb',
      JSON.stringify(data.nodeIds),
      data.collapsed ? 1 : 0
    );

    return this.getGroupById(result.lastInsertRowid as number)!;
  }

  /**
   * Get group by ID
   */
  getGroupById(id: number): VisionBoardGroup | null {
    const stmt = this.db.prepare('SELECT * FROM vision_board_groups WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToGroup(row) : null;
  }

  /**
   * Get all groups for a board
   */
  getGroupsByBoard(boardId: number): VisionBoardGroup[] {
    const stmt = this.db.prepare('SELECT * FROM vision_board_groups WHERE board_id = ?');
    const rows = stmt.all(boardId);
    return rows.map(row => this.mapRowToGroup(row));
  }

  /**
   * Update group
   */
  updateGroup(id: number, data: UpdateVisionBoardGroupData): VisionBoardGroup | null {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color); }
    if (data.nodeIds !== undefined) { updates.push('node_ids = ?'); params.push(JSON.stringify(data.nodeIds)); }
    if (data.collapsed !== undefined) { updates.push('collapsed = ?'); params.push(data.collapsed ? 1 : 0); }

    if (updates.length === 0) {
      return this.getGroupById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`UPDATE vision_board_groups SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    return this.getGroupById(id);
  }

  /**
   * Delete group
   */
  deleteGroup(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM vision_board_groups WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Helper Methods ====================

  /**
   * Get complete board data (board + nodes + connections + groups)
   */
  getBoardData(boardId: number): {
    board: VisionBoard;
    nodes: VisionBoardNode[];
    connections: VisionBoardConnection[];
    groups: VisionBoardGroup[];
  } | null {
    const board = this.getBoardById(boardId);
    if (!board) return null;

    return {
      board,
      nodes: this.getNodesByBoard(boardId),
      connections: this.getConnectionsByBoard(boardId),
      groups: this.getGroupsByBoard(boardId)
    };
  }

  /**
   * Export board to JSON
   */
  exportBoardToJSON(boardId: number): string | null {
    const data = this.getBoardData(boardId);
    if (!data) return null;
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import board from JSON
   */
  importBoardFromJSON(json: string, userId: number, newName?: string): VisionBoard | null {
    try {
      const data = JSON.parse(json);
      const boardData = data.board;

      // Create new board
      const newBoard = this.createBoard(
        {
          name: newName || `${boardData.name} (Imported)`,
          description: boardData.description,
          type: boardData.type,
          canvasWidth: boardData.canvasWidth,
          canvasHeight: boardData.canvasHeight,
          backgroundColor: boardData.backgroundColor,
          gridEnabled: boardData.gridEnabled,
          gridSize: boardData.gridSize,
          snapToGrid: boardData.snapToGrid
        },
        userId
      );

      // Import nodes
      const nodeIdMap = new Map<number, number>();
      for (const node of data.nodes) {
        const newNode = this.createNode({
          ...node,
          boardId: newBoard.id,
          metadata: node.metadata
        });
        nodeIdMap.set(node.id, newNode.id);
      }

      // Import connections
      for (const conn of data.connections) {
        const newFromId = nodeIdMap.get(conn.fromNodeId);
        const newToId = nodeIdMap.get(conn.toNodeId);
        if (newFromId && newToId) {
          this.createConnection({
            ...conn,
            boardId: newBoard.id,
            fromNodeId: newFromId,
            toNodeId: newToId,
            metadata: conn.metadata
          });
        }
      }

      // Import groups
      for (const group of data.groups) {
        const newNodeIds = group.nodeIds
          .map((oldId: number) => nodeIdMap.get(oldId))
          .filter((id: number | undefined): id is number => id !== undefined);
        
        if (newNodeIds.length > 0) {
          this.createGroup({
            ...group,
            boardId: newBoard.id,
            nodeIds: newNodeIds
          });
        }
      }

      return newBoard;
    } catch (error) {
      console.error('Failed to import board from JSON:', error);
      return null;
    }
  }

  // ==================== Mapping Functions ====================

  private mapRowToBoard(row: any): VisionBoard {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type as VisionBoardType,
      status: row.status as VisionBoardStatus,
      projectId: row.project_id,
      thumbnail: row.thumbnail,
      canvasWidth: row.canvas_width,
      canvasHeight: row.canvas_height,
      backgroundColor: row.background_color,
      gridEnabled: row.grid_enabled === 1,
      gridSize: row.grid_size,
      snapToGrid: row.snap_to_grid === 1,
      zoom: row.zoom,
      viewportX: row.viewport_x,
      viewportY: row.viewport_y,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToNode(row: any): VisionBoardNode {
    return {
      id: row.id,
      boardId: row.board_id,
      type: row.type as NodeType,
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      rotation: row.rotation,
      zIndex: row.z_index,
      locked: row.locked === 1,
      visible: row.visible === 1,
      text: row.text,
      fontSize: row.font_size,
      fontFamily: row.font_family,
      fontWeight: row.font_weight,
      textAlign: row.text_align,
      textColor: row.text_color,
      backgroundColor: row.background_color,
      borderColor: row.border_color,
      borderWidth: row.border_width,
      borderRadius: row.border_radius,
      opacity: row.opacity,
      shadow: row.shadow,
      shapeType: row.shape_type as ShapeType | null,
      imageUrl: row.image_url,
      imageFit: row.image_fit,
      taskId: row.task_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToConnection(row: any): VisionBoardConnection {
    return {
      id: row.id,
      boardId: row.board_id,
      fromNodeId: row.from_node_id,
      toNodeId: row.to_node_id,
      lineType: row.line_type as LineType,
      color: row.color,
      width: row.width,
      label: row.label,
      labelPosition: row.label_position,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToGroup(row: any): VisionBoardGroup {
    return {
      id: row.id,
      boardId: row.board_id,
      name: row.name,
      color: row.color,
      nodeIds: JSON.parse(row.node_ids),
      collapsed: row.collapsed === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
