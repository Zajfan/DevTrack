# Vision Board Feature - Complete Documentation

## Overview
The Vision Board feature is a powerful visual planning tool integrated into DevTrack. It allows users to create canvas-based visual representations of project visions, roadmaps, mind maps, system architectures, user flows, and more.

**Key Features:**
- **Multiple Board Types**: Roadmaps, mind maps, wireframes, architecture diagrams, user flows, and free-form canvases
- **Rich Node Types**: Text, images, shapes, sticky notes, icons, links, tasks, milestones, decisions, and processes
- **Flexible Connections**: Multiple line styles (solid, dashed, arrow, curved) connecting nodes
- **Grouping & Organization**: Group nodes together for better organization
- **Template System**: Pre-built templates for common use cases
- **Export/Import**: JSON export/import for backup and sharing
- **Project Integration**: Link vision boards to projects
- **Task Integration**: Link vision board nodes to actual DevTrack tasks

## Architecture

### Database Tables

#### `vision_boards`
Main vision board entity with canvas settings.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Board name |
| description | TEXT | Board description |
| type | TEXT | Board type (roadmap, mindmap, canvas, wireframe, architecture, userflow, custom) |
| status | TEXT | Status (draft, active, archived) |
| project_id | INTEGER | Optional link to project |
| thumbnail | TEXT | Base64 thumbnail or URL |
| canvas_width | INTEGER | Canvas width in pixels |
| canvas_height | INTEGER | Canvas height in pixels |
| background_color | TEXT | Canvas background color |
| grid_enabled | INTEGER | Whether grid is enabled |
| grid_size | INTEGER | Grid size in pixels |
| snap_to_grid | INTEGER | Whether snap-to-grid is enabled |
| zoom | REAL | Current zoom level |
| viewport_x | REAL | Current viewport X position |
| viewport_y | REAL | Current viewport Y position |
| created_by | INTEGER | User who created the board |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### `vision_board_nodes`
Individual elements on the canvas.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| board_id | INTEGER | Foreign key to vision_boards |
| type | TEXT | Node type (text, image, shape, sticky_note, icon, link, task, milestone, decision, process) |
| x | REAL | X position on canvas |
| y | REAL | Y position on canvas |
| width | REAL | Node width |
| height | REAL | Node height |
| rotation | REAL | Rotation in degrees |
| z_index | INTEGER | Layer order |
| locked | INTEGER | Whether node is locked |
| visible | INTEGER | Whether node is visible |
| text | TEXT | Text content |
| font_size | INTEGER | Font size |
| font_family | TEXT | Font family |
| font_weight | TEXT | Font weight |
| text_align | TEXT | Text alignment |
| text_color | TEXT | Text color |
| background_color | TEXT | Background color |
| border_color | TEXT | Border color |
| border_width | INTEGER | Border width |
| border_radius | INTEGER | Border radius |
| opacity | REAL | Opacity (0-1) |
| shadow | TEXT | Shadow CSS |
| shape_type | TEXT | Shape type (rectangle, circle, triangle, diamond, hexagon, arrow, cloud, star) |
| image_url | TEXT | Image URL or base64 |
| image_fit | TEXT | Image fit (cover, contain, fill) |
| task_id | INTEGER | Optional link to DevTrack task |
| metadata | TEXT | JSON metadata |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### `vision_board_connections`
Lines/arrows connecting nodes.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| board_id | INTEGER | Foreign key to vision_boards |
| from_node_id | INTEGER | Source node ID |
| to_node_id | INTEGER | Target node ID |
| line_type | TEXT | Line type (solid, dashed, dotted, arrow, double_arrow, curved) |
| color | TEXT | Line color |
| width | INTEGER | Line width |
| label | TEXT | Optional label text |
| label_position | REAL | Label position (0=start, 0.5=middle, 1=end) |
| metadata | TEXT | JSON metadata |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### `vision_board_groups`
Groups of nodes for organization.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| board_id | INTEGER | Foreign key to vision_boards |
| name | TEXT | Group name |
| color | TEXT | Group color |
| node_ids | TEXT | JSON array of node IDs |
| collapsed | INTEGER | Whether group is collapsed |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

### Indexes
- `idx_vision_boards_project` - Fast lookup of boards by project
- `idx_vision_boards_created_by` - Fast lookup of boards by creator
- `idx_vision_board_nodes_board` - Fast lookup of nodes by board
- `idx_vision_board_nodes_task` - Fast lookup of nodes linked to tasks
- `idx_vision_board_connections_board` - Fast lookup of connections by board
- `idx_vision_board_groups_board` - Fast lookup of groups by board

## API Reference

### Vision Board Manager Service

#### Vision Board CRUD

**createBoard(data, userId): VisionBoard**
```typescript
const board = visionBoardManager.createBoard({
  name: 'Product Roadmap 2025',
  description: 'Q1-Q4 Product Development Plan',
  type: VisionBoardType.Roadmap,
  projectId: 1, // Optional
  canvasWidth: 4000,
  canvasHeight: 3000,
  backgroundColor: '#ffffff',
  gridEnabled: true,
  gridSize: 20,
  snapToGrid: true
}, userId);
```

**createBoardFromTemplate(template, name, userId, projectId?): Object**
```typescript
const { board, nodes, connections } = visionBoardManager.createBoardFromTemplate(
  VISION_BOARD_TEMPLATES[0], // Product Roadmap template
  'My Roadmap',
  userId,
  projectId // Optional
);
```

**getBoardById(id): VisionBoard | null**
```typescript
const board = visionBoardManager.getBoardById(1);
```

**getAllBoards(filters?): VisionBoard[]**
```typescript
// Get all boards
const all = visionBoardManager.getAllBoards();

// Filter by type
const roadmaps = visionBoardManager.getAllBoards({ 
  type: VisionBoardType.Roadmap 
});

// Filter by project
const projectBoards = visionBoardManager.getAllBoards({ 
  projectId: 1 
});

// Filter by status
const active = visionBoardManager.getAllBoards({ 
  status: VisionBoardStatus.Active 
});

// Get boards without project link (standalone)
const standalone = visionBoardManager.getAllBoards({ 
  projectId: null 
});
```

**updateBoard(id, data): VisionBoard | null**
```typescript
const updated = visionBoardManager.updateBoard(1, {
  name: 'Updated Name',
  status: VisionBoardStatus.Active,
  thumbnail: 'data:image/png;base64,...',
  zoom: 1.5,
  viewportX: 100,
  viewportY: 200
});
```

**deleteBoard(id): boolean**
```typescript
const deleted = visionBoardManager.deleteBoard(1);
// Also deletes all nodes, connections, and groups (CASCADE)
```

**duplicateBoard(id, newName, userId): VisionBoard | null**
```typescript
const duplicate = visionBoardManager.duplicateBoard(
  1, 
  'Copy of Roadmap', 
  userId
);
// Creates complete copy with all nodes, connections, and groups
```

#### Node Operations

**createNode(data): VisionBoardNode**
```typescript
// Create text node
const textNode = visionBoardManager.createNode({
  boardId: 1,
  type: NodeType.Text,
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  text: 'Project Goal',
  fontSize: 16,
  fontFamily: 'Inter',
  textColor: '#000000',
  backgroundColor: '#ffffff',
  borderColor: '#3b82f6',
  borderWidth: 2,
  borderRadius: 8
});

// Create shape node
const shapeNode = visionBoardManager.createNode({
  boardId: 1,
  type: NodeType.Shape,
  shapeType: ShapeType.Circle,
  x: 400,
  y: 100,
  width: 150,
  height: 150,
  text: 'Core Feature',
  backgroundColor: '#10b981',
  borderColor: '#059669'
});

// Create sticky note
const stickyNote = visionBoardManager.createNode({
  boardId: 1,
  type: NodeType.StickyNote,
  x: 700,
  y: 100,
  width: 180,
  height: 180,
  text: 'Important Note',
  backgroundColor: '#fef3c7', // Yellow
  fontSize: 14
});

// Create image node
const imageNode = visionBoardManager.createNode({
  boardId: 1,
  type: NodeType.Image,
  x: 100,
  y: 300,
  width: 300,
  height: 200,
  imageUrl: 'https://example.com/image.png',
  imageFit: 'cover'
});

// Create task-linked node
const taskNode = visionBoardManager.createNode({
  boardId: 1,
  type: NodeType.Task,
  x: 500,
  y: 300,
  width: 200,
  height: 80,
  text: 'Implement Feature X',
  taskId: 42, // Link to actual DevTrack task
  backgroundColor: '#3b82f6'
});
```

**getNodeById(id): VisionBoardNode | null**
```typescript
const node = visionBoardManager.getNodeById(1);
```

**getNodesByBoard(boardId): VisionBoardNode[]**
```typescript
const nodes = visionBoardManager.getNodesByBoard(1);
// Returns nodes ordered by z_index (layer order)
```

**updateNode(id, data): VisionBoardNode | null**
```typescript
// Move and resize
const updated = visionBoardManager.updateNode(1, {
  x: 200,
  y: 150,
  width: 250,
  height: 120
});

// Update styling
const styled = visionBoardManager.updateNode(1, {
  backgroundColor: '#fbbf24',
  borderColor: '#f59e0b',
  opacity: 0.8,
  shadow: '0 4px 6px rgba(0,0,0,0.1)'
});

// Update text
const texted = visionBoardManager.updateNode(1, {
  text: 'Updated Text',
  fontSize: 18,
  fontWeight: 'bold'
});

// Lock node
const locked = visionBoardManager.updateNode(1, {
  locked: true
});

// Change z-index (bring to front)
const fronted = visionBoardManager.updateNode(1, {
  zIndex: 100
});
```

**deleteNode(id): boolean**
```typescript
const deleted = visionBoardManager.deleteNode(1);
// Also deletes connections to/from this node (CASCADE)
```

**bulkUpdateNodePositions(updates): void**
```typescript
// Efficient batch update for dragging multiple nodes
visionBoardManager.bulkUpdateNodePositions([
  { id: 1, x: 100, y: 200 },
  { id: 2, x: 300, y: 200 },
  { id: 3, x: 500, y: 200 }
]);
```

#### Connection Operations

**createConnection(data): VisionBoardConnection**
```typescript
// Create arrow connection
const arrow = visionBoardManager.createConnection({
  boardId: 1,
  fromNodeId: 1,
  toNodeId: 2,
  lineType: LineType.Arrow,
  color: '#3b82f6',
  width: 2,
  label: 'leads to',
  labelPosition: 0.5 // Middle
});

// Create dashed line
const dashed = visionBoardManager.createConnection({
  boardId: 1,
  fromNodeId: 2,
  toNodeId: 3,
  lineType: LineType.Dashed,
  color: '#6b7280',
  width: 1
});

// Create double arrow
const doubleArrow = visionBoardManager.createConnection({
  boardId: 1,
  fromNodeId: 3,
  toNodeId: 4,
  lineType: LineType.DoubleArrow,
  color: '#10b981',
  width: 3,
  label: 'bidirectional'
});
```

**getConnectionsByBoard(boardId): VisionBoardConnection[]**
```typescript
const connections = visionBoardManager.getConnectionsByBoard(1);
```

**updateConnection(id, data): VisionBoardConnection | null**
```typescript
const updated = visionBoardManager.updateConnection(1, {
  color: '#ef4444',
  width: 3,
  label: 'critical path',
  labelPosition: 0.3
});
```

**deleteConnection(id): boolean**
```typescript
const deleted = visionBoardManager.deleteConnection(1);
```

#### Group Operations

**createGroup(data): VisionBoardGroup**
```typescript
const group = visionBoardManager.createGroup({
  boardId: 1,
  name: 'Q1 Features',
  color: '#dbeafe',
  nodeIds: [1, 2, 3, 4],
  collapsed: false
});
```

**getGroupsByBoard(boardId): VisionBoardGroup[]**
```typescript
const groups = visionBoardManager.getGroupsByBoard(1);
```

**updateGroup(id, data): VisionBoardGroup | null**
```typescript
// Add more nodes
const updated = visionBoardManager.updateGroup(1, {
  nodeIds: [1, 2, 3, 4, 5, 6]
});

// Toggle collapse
const collapsed = visionBoardManager.updateGroup(1, {
  collapsed: true
});
```

**deleteGroup(id): boolean**
```typescript
const deleted = visionBoardManager.deleteGroup(1);
// Note: Deleting group does NOT delete nodes
```

#### Helper Methods

**getBoardData(boardId): Object | null**
```typescript
const data = visionBoardManager.getBoardData(1);
// Returns: { board, nodes, connections, groups }
// Complete board state in single call
```

**exportBoardToJSON(boardId): string | null**
```typescript
const json = visionBoardManager.exportBoardToJSON(1);
// Export complete board as JSON string
```

**importBoardFromJSON(json, userId, newName?): VisionBoard | null**
```typescript
const imported = visionBoardManager.importBoardFromJSON(
  jsonString,
  userId,
  'Imported Board'
);
// Creates new board from JSON export
```

## IPC API (Renderer Process)

All Vision Board operations are exposed via `window.electronAPI.visionBoard`:

```typescript
// In renderer process (React components)

// Create board
const board = await window.electronAPI.visionBoard.create({
  name: 'My Vision',
  type: 'canvas',
  projectId: 1
}, userId);

// Get all boards
const boards = await window.electronAPI.visionBoard.getAll();

// Get boards for project
const projectBoards = await window.electronAPI.visionBoard.getByProject(1);

// Create node
const node = await window.electronAPI.visionBoard.createNode({
  boardId: board.id,
  type: 'shape',
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  text: 'Step 1'
});

// Create connection
const conn = await window.electronAPI.visionBoard.createConnection({
  boardId: board.id,
  fromNodeId: node1.id,
  toNodeId: node2.id,
  lineType: 'arrow'
});

// Get complete board data
const data = await window.electronAPI.visionBoard.getBoardData(board.id);
// Returns: { board, nodes, connections, groups }

// Export to JSON
const json = await window.electronAPI.visionBoard.exportToJSON(board.id);

// Import from JSON
const imported = await window.electronAPI.visionBoard.importFromJSON(json, userId);
```

## Templates

DevTrack includes 5 pre-built templates:

### 1. Product Roadmap
Timeline-based roadmap with quarterly milestones.
```typescript
VisionBoardType.Roadmap
- Q1, Q2, Q3, Q4 milestone nodes
- Perfect for product planning
```

### 2. Mind Map
Hierarchical brainstorming structure.
```typescript
VisionBoardType.MindMap
- Central idea node
- 4 branch nodes
- Great for ideation
```

### 3. System Architecture
Technical architecture diagram.
```typescript
VisionBoardType.Architecture
- Frontend, Backend, Database nodes
- Perfect for system design
```

### 4. User Flow
User journey and interaction flow.
```typescript
VisionBoardType.UserFlow
- Start, Process, Decision, End nodes
- Great for UX planning
```

### 5. Blank Canvas
Empty canvas for free-form design.
```typescript
VisionBoardType.Canvas
- No preset nodes
- Complete creative freedom
```

## Shape Presets

8 shape types with predefined styling:

| Shape | Color | Use Case |
|-------|-------|----------|
| Rectangle | Blue (#3b82f6) | General boxes, containers |
| Circle | Green (#10b981) | Start/end points, emphasis |
| Triangle | Orange (#f59e0b) | Warnings, alerts |
| Diamond | Purple (#8b5cf6) | Decision points |
| Hexagon | Pink (#ec4899) | Special states |
| Arrow | Teal (#14b8a6) | Directional flow |
| Cloud | Light Blue (#e0f2fe) | Cloud services, external |
| Star | Yellow (#fbbf24) | Highlights, important |

## Sticky Note Colors

8 sticky note colors for quick visual organization:
- Yellow (#fef3c7) - General notes
- Red (#fecaca) - Urgent/important
- Blue (#bfdbfe) - Information
- Green (#bbf7d0) - Success/done
- Purple (#e9d5ff) - Ideas
- Orange (#fed7aa) - Warnings
- Pink (#fbcfe8) - Design/UI
- Indigo (#ddd6fe) - Technical

## Canvas Settings

### Default Dimensions
- **Canvas Size**: 4000x3000 pixels (large workspace)
- **Grid Size**: 20 pixels
- **Default Zoom**: 1.0
- **Background**: White (#ffffff)

### Node Defaults
- **Width**: 200 pixels
- **Height**: 100 pixels
- **Font Size**: 14px
- **Font Family**: Inter, sans-serif
- **Border Width**: 2px
- **Border Radius**: 8px

## Best Practices

### 1. Board Organization
- Use **groups** to organize related nodes
- Apply **consistent colors** for similar elements
- Lock nodes that shouldn't be moved
- Use **z-index** to layer elements properly

### 2. Connection Usage
- **Solid lines**: General relationships
- **Dashed lines**: Weak/optional connections
- **Arrows**: Directional flow
- **Curved lines**: Visual appeal, avoid overlap

### 3. Node Types
- **Shapes**: Process steps, states
- **Sticky Notes**: Quick ideas, annotations
- **Text**: Labels, descriptions
- **Images**: Screenshots, diagrams, logos
- **Task Nodes**: Link to actual work items

### 4. Performance
- Limit boards to **500 nodes** for best performance
- Use **groups** to hide collapsed sections
- Export/archive old boards
- Use **bulkUpdateNodePositions** for dragging multiple nodes

### 5. Collaboration
- Export boards to **JSON** for sharing
- Use **thumbnails** for quick previews
- Link boards to **projects** for context
- Use **task-linked nodes** to connect vision to work

## Use Cases

### Product Planning
1. Create **Roadmap** board
2. Add quarterly **milestone** nodes
3. Add **feature nodes** under each quarter
4. Connect features with **dependencies**
5. Link nodes to actual **tasks**
6. Update as features are completed

### System Design
1. Create **Architecture** board
2. Add **component nodes** (frontend, backend, DB, etc.)
3. Draw **connections** showing data flow
4. Add **decision nodes** for key architectural choices
5. Include **cloud nodes** for external services
6. Export for documentation

### User Experience
1. Create **User Flow** board
2. Start with **circle node** (entry point)
3. Add **process nodes** for user actions
4. Add **decision nodes** for conditionals
5. Connect with **arrows** showing flow
6. Add **sticky notes** for insights

### Team Brainstorming
1. Create **Mind Map** board
2. Add **central idea** in circle
3. Add **branch nodes** for main themes
4. Add **sub-nodes** for details
5. Use **different colors** for different categories
6. Group related ideas

### Project Vision
1. Create **Canvas** board (blank)
2. Add **images** for visual inspiration
3. Add **text nodes** for goals
4. Add **sticky notes** for quick thoughts
5. Organize with **groups**
6. Link to **project** for reference

## Integration with DevTrack

### Project Linking
Vision boards can be linked to projects:
```typescript
// Create board for project
const board = await window.electronAPI.visionBoard.create({
  name: 'Project Vision',
  type: 'canvas',
  projectId: 1 // Link to project
}, userId);

// Get all boards for project
const projectBoards = await window.electronAPI.visionBoard.getByProject(1);
```

### Task Linking
Nodes can link to actual DevTrack tasks:
```typescript
// Create node linked to task
const node = await window.electronAPI.visionBoard.createNode({
  boardId: 1,
  type: 'task',
  x: 100,
  y: 100,
  text: 'Implement Auth',
  taskId: 42 // Link to task #42
});

// Update task completion in vision board
// (Future: Auto-update node styling when task is completed)
```

### Workflow
1. **Plan**: Create vision board showing project goals
2. **Design**: Add nodes for features, components
3. **Execute**: Link nodes to tasks as work begins
4. **Track**: Update board as tasks are completed
5. **Review**: Use board for retrospectives

## Troubleshooting

### Board Not Loading
```typescript
// Check board exists
const board = await window.electronAPI.visionBoard.getById(boardId);
if (!board) {
  console.error('Board not found');
}

// Check complete data
const data = await window.electronAPI.visionBoard.getBoardData(boardId);
console.log('Nodes:', data.nodes.length);
console.log('Connections:', data.connections.length);
```

### Nodes Not Appearing
- Check **z-index**: Lower z-index nodes are behind others
- Check **visible**: Node may be hidden
- Check **viewport**: Node may be outside current view
- Check **opacity**: Node may be transparent

### Connections Not Drawing
- Verify **fromNodeId** and **toNodeId** exist
- Check node positions (connections need valid coordinates)
- Check **color** (may match background)
- Check **width** (may be too thin)

### Performance Issues
- Limit to **500 nodes** per board
- Use **groups** and collapse unused sections
- Avoid very large **images** (compress first)
- Use **bulkUpdate** for batch operations
- Consider splitting into multiple boards

### Export/Import Issues
```typescript
// Validate JSON before import
try {
  const parsed = JSON.parse(jsonString);
  if (!parsed.board || !parsed.nodes) {
    throw new Error('Invalid format');
  }
  const imported = await window.electronAPI.visionBoard.importFromJSON(
    jsonString, 
    userId
  );
} catch (error) {
  console.error('Import failed:', error);
}
```

## Future Enhancements

### Planned Features
1. **Real-time Collaboration**: Multiple users editing simultaneously
2. **Version History**: Track changes over time
3. **Auto-Layout**: Automatic node positioning algorithms
4. **Smart Connectors**: Auto-routing around nodes
5. **Image Upload**: Direct upload instead of URLs
6. **Drawing Tools**: Pen, highlighter, eraser
7. **Nested Groups**: Groups within groups
8. **Custom Shapes**: User-defined shape library
9. **Animation**: Animate transitions and updates
10. **Presentation Mode**: Full-screen presentation with slides

### Integration Ideas
1. **Task Sync**: Auto-update node styling when tasks complete
2. **Gantt Integration**: Generate Gantt from roadmap boards
3. **Export to PDF**: High-quality PDF export
4. **Export to Image**: PNG/SVG export
5. **Embed in Reports**: Include boards in reports
6. **Mobile View**: Read-only mobile companion
7. **AI Suggestions**: AI-assisted layout and organization
8. **Template Marketplace**: Share custom templates

## Summary

The Vision Board feature provides:
- ✅ 7 board types (roadmap, mindmap, canvas, etc.)
- ✅ 10 node types (text, shape, image, sticky note, etc.)
- ✅ 8 shape types (rectangle, circle, diamond, etc.)
- ✅ 6 line types (solid, dashed, arrow, etc.)
- ✅ Grouping and organization
- ✅ Project and task integration
- ✅ Export/import capabilities
- ✅ Template system
- ✅ 4 database tables with indexes
- ✅ 27 IPC handlers
- ✅ Full TypeScript typing
- ✅ Complete API documentation

**TIER 5 - Utilities**: Vision Board is utility #2, providing visual project planning capabilities that complement the directory scanner for a complete utilities suite.
