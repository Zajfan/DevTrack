import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import {
  Box,
  Paper,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Typography,
  Menu,
  MenuItem,
  Divider,
  TextField,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  GridOn as GridOnIcon,
  GridOff as GridOffIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Delete as DeleteIcon,
  AspectRatio as SelectIcon,
  Edit as EditIcon,
  TextFields as TextIcon,
  Image as ImageIcon,
  Crop32 as ShapeIcon,
  StickyNote2 as StickyNoteIcon,
  ArrowForward as ArrowIcon,
  Circle as CircleIcon,
  Rectangle as RectangleIcon,
  Star as StarIcon,
  Diamond as DiamondIcon,
} from '@mui/icons-material';
import { SketchPicker } from 'react-color';
import {
  VisionBoard,
  VisionBoardNode,
  VisionBoardConnection,
  NodeType,
  ShapeType,
  LineType,
  STICKY_NOTE_COLORS,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
} from '../../main/models/VisionBoard';

interface VisionBoardEditorProps {
  boardId: number;
  onSave?: () => void;
}

type Tool = 'select' | 'text' | 'shape' | 'sticky' | 'image' | 'line';

export const VisionBoardEditor: React.FC<VisionBoardEditorProps> = ({ boardId, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [board, setBoard] = useState<VisionBoard | null>(null);
  const [nodes, setNodes] = useState<VisionBoardNode[]>([]);
  const [connections, setConnections] = useState<VisionBoardConnection[]>([]);
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1.0);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<null | HTMLElement>(null);
  const [shapeMenuAnchor, setShapeMenuAnchor] = useState<null | HTMLElement>(null);
  const [fillColor, setFillColor] = useState('#3b82f6');
  const [strokeColor, setStrokeColor] = useState('#2563eb');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Load board data
  useEffect(() => {
    loadBoardData();
  }, [boardId]);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: board?.backgroundColor || '#ffffff',
    });

    fabricCanvasRef.current = canvas;

    // Setup grid if enabled
    if (gridEnabled) {
      drawGrid(canvas);
    }

    // Handle object selection
    canvas.on('selection:created', (e: any) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e: any) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // Handle object modifications for auto-save
    canvas.on('object:modified', () => {
      saveCanvasState();
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [canvasRef.current, board]);

  // Load board data from database
  const loadBoardData = async () => {
    try {
      const data = await window.electronAPI.visionBoard.getBoardData(boardId);
      if (data) {
        setBoard(data.board);
        setNodes(data.nodes);
        setConnections(data.connections);
        setZoom(data.board.zoom);
        setGridEnabled(data.board.gridEnabled);
        
        // Load nodes onto canvas
        if (fabricCanvasRef.current) {
          loadNodesToCanvas(data.nodes);
        }
      }
    } catch (error) {
      console.error('Failed to load board data:', error);
    }
  };

  // Load nodes to canvas
  const loadNodesToCanvas = (nodesToLoad: VisionBoardNode[]) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    if (gridEnabled) {
      drawGrid(canvas);
    }

    nodesToLoad.forEach(node => {
      let fabricObject: fabric.Object | null = null;

      switch (node.type) {
        case NodeType.Text:
          fabricObject = new fabric.Textbox(node.text || '', {
            left: node.x,
            top: node.y,
            width: node.width,
            height: node.height,
            fontSize: node.fontSize || 14,
            fontFamily: node.fontFamily || 'Inter',
            fill: node.textColor || '#000000',
            backgroundColor: node.backgroundColor || 'transparent',
          });
          break;

        case NodeType.Shape:
          fabricObject = createShape(node);
          break;

        case NodeType.StickyNote:
          fabricObject = new fabric.Rect({
            left: node.x,
            top: node.y,
            width: node.width,
            height: node.height,
            fill: node.backgroundColor || STICKY_NOTE_COLORS[0],
            stroke: node.borderColor || '#000000',
            strokeWidth: 1,
            rx: 5,
            ry: 5,
          });
          break;

        case NodeType.Image:
          if (node.imageUrl) {
            fabric.Image.fromURL(node.imageUrl, {}, (img: any) => {
              img.set({
                left: node.x,
                top: node.y,
                scaleX: node.width / (img.width || 1),
                scaleY: node.height / (img.height || 1),
              });
              canvas.add(img);
            });
          }
          break;
      }

      if (fabricObject) {
        fabricObject.set({
          angle: node.rotation,
          opacity: node.opacity,
          selectable: !node.locked,
          visible: node.visible,
        });
        (fabricObject as any).nodeId = node.id;
        canvas.add(fabricObject);
      }
    });

    canvas.renderAll();
  };

  // Create shape based on type
  const createShape = (node: VisionBoardNode): fabric.Object => {
    const options = {
      left: node.x,
      top: node.y,
      width: node.width,
      height: node.height,
      fill: node.backgroundColor || '#3b82f6',
      stroke: node.borderColor || '#2563eb',
      strokeWidth: node.borderWidth || 2,
    };

    switch (node.shapeType) {
      case ShapeType.Rectangle:
        return new fabric.Rect({ ...options, rx: node.borderRadius || 8, ry: node.borderRadius || 8 });
      
      case ShapeType.Circle:
        return new fabric.Circle({ 
          ...options, 
          radius: Math.min(node.width, node.height) / 2 
        });
      
      case ShapeType.Triangle:
        return new fabric.Triangle(options);
      
      case ShapeType.Star:
        // Create star using polygon
        const points = createStarPoints(5, node.width / 2, node.height / 3);
        return new fabric.Polygon(points, options);
      
      default:
        return new fabric.Rect(options);
    }
  };

  // Create star points
  const createStarPoints = (numPoints: number, outerRadius: number, innerRadius: number): fabric.Point[] => {
    const points: fabric.Point[] = [];
    const angleStep = Math.PI / numPoints;
    
    for (let i = 0; i < numPoints * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * angleStep - Math.PI / 2;
      points.push(new fabric.Point(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      ));
    }
    
    return points;
  };

  // Draw grid
  const drawGrid = (canvas: fabric.Canvas) => {
    const gridSize = board?.gridSize || 20;
    const width = canvas.getWidth();
    const height = canvas.getHeight();

    for (let i = 0; i < width / gridSize; i++) {
      canvas.add(new fabric.Line([i * gridSize, 0, i * gridSize, height], {
        stroke: '#e5e7eb',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      }));
    }

    for (let i = 0; i < height / gridSize; i++) {
      canvas.add(new fabric.Line([0, i * gridSize, width, i * gridSize], {
        stroke: '#e5e7eb',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      }));
    }
  };

  // Add text
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const text = new fabric.Textbox('Double click to edit', {
      left: 100,
      top: 100,
      width: 200,
      fontSize: 16,
      fill: strokeColor,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    saveNodeToDatabase(text, NodeType.Text);
  };

  // Add shape
  const addShape = (shapeType: ShapeType) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const shape = createShapeByType(shapeType);
    canvas.add(shape);
    canvas.setActiveObject(shape);
    saveNodeToDatabase(shape, NodeType.Shape, shapeType);
    setShapeMenuAnchor(null);
  };

  // Create shape by type
  const createShapeByType = (shapeType: ShapeType): fabric.Object => {
    const options = {
      left: 100,
      top: 100,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: 2,
    };

    switch (shapeType) {
      case ShapeType.Rectangle:
        return new fabric.Rect({ ...options, rx: 8, ry: 8 });
      case ShapeType.Circle:
        return new fabric.Circle({ ...options, radius: 50 });
      case ShapeType.Triangle:
        return new fabric.Triangle(options);
      case ShapeType.Star:
        const points = createStarPoints(5, 50, 25);
        return new fabric.Polygon(points, { ...options, left: 150, top: 150 });
      default:
        return new fabric.Rect(options);
    }
  };

  // Add sticky note
  const addStickyNote = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const sticky = new fabric.Rect({
      left: 100,
      top: 100,
      width: 180,
      height: 180,
      fill: STICKY_NOTE_COLORS[0],
      stroke: '#f59e0b',
      strokeWidth: 1,
      rx: 5,
      ry: 5,
    });

    canvas.add(sticky);
    canvas.setActiveObject(sticky);
    saveNodeToDatabase(sticky, NodeType.StickyNote);
  };

  // Save node to database
  const saveNodeToDatabase = async (
    obj: fabric.Object,
    type: NodeType,
    shapeType?: ShapeType
  ) => {
    try {
      const node = await window.electronAPI.visionBoard.createNode({
        boardId,
        type,
        x: obj.left || 0,
        y: obj.top || 0,
        width: obj.width || DEFAULT_NODE_WIDTH,
        height: obj.height || DEFAULT_NODE_HEIGHT,
        backgroundColor: (obj as any).fill || fillColor,
        borderColor: (obj as any).stroke || strokeColor,
        borderWidth: (obj as any).strokeWidth || 2,
        shapeType,
      });

      (obj as any).nodeId = node.id;
      setNodes(prev => [...prev, node]);
    } catch (error) {
      console.error('Failed to save node:', error);
    }
  };

  // Save canvas state for undo/redo
  const saveCanvasState = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const state = JSON.stringify(canvas.toJSON());
    setUndoStack(prev => [...prev.slice(-19), state]); // Keep last 20 states
    setRedoStack([]); // Clear redo stack
  };

  // Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const currentState = JSON.stringify(canvas.toJSON());
    const previousState = undoStack[undoStack.length - 1];
    
    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));
    
    canvas.loadFromJSON(previousState, () => {
      canvas.renderAll();
    });
  };

  // Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const currentState = JSON.stringify(canvas.toJSON());
    const nextState = redoStack[redoStack.length - 1];
    
    setUndoStack(prev => [...prev, currentState]);
    setRedoStack(prev => prev.slice(0, -1));
    
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
    });
  };

  // Delete selected object
  const handleDelete = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;

    const nodeId = (selectedObject as any).nodeId;
    if (nodeId) {
      window.electronAPI.visionBoard.deleteNode(nodeId);
      setNodes(prev => prev.filter(n => n.id !== nodeId));
    }

    canvas.remove(selectedObject);
    setSelectedObject(null);
    saveCanvasState();
  };

  // Handle zoom
  const handleZoomChange = (_: Event, value: number | number[]) => {
    const newZoom = value as number;
    setZoom(newZoom);
    
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.setZoom(newZoom);
      canvas.renderAll();
    }
  };

  // Toggle grid
  const toggleGrid = () => {
    setGridEnabled(!gridEnabled);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.clear();
      if (!gridEnabled) {
        drawGrid(canvas);
      }
      loadNodesToCanvas(nodes);
    }
  };

  // Save board
  const handleSave = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      // Update board with current viewport and zoom
      await window.electronAPI.visionBoard.update(boardId, {
        zoom,
        viewportX: canvas.viewportTransform?.[4] || 0,
        viewportY: canvas.viewportTransform?.[5] || 0,
        thumbnail: canvas.toDataURL({ format: 'png', quality: 0.5, multiplier: 1 }),
      });

      // Update all nodes
      const objects = canvas.getObjects();
      const updatePromises = objects
        .filter((obj: any) => (obj as any).nodeId)
        .map((obj: any) => {
          const nodeId = (obj as any).nodeId;
          return window.electronAPI.visionBoard.updateNode(nodeId, {
            x: obj.left || 0,
            y: obj.top || 0,
            width: obj.width || DEFAULT_NODE_WIDTH,
            height: obj.height || DEFAULT_NODE_HEIGHT,
            rotation: obj.angle || 0,
          });
        });

      await Promise.all(updatePromises);
      
      if (onSave) onSave();
    } catch (error) {
      console.error('Failed to save board:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'center', borderRadius: 0 }}>
        {/* Tool Selection */}
        <ToggleButtonGroup
          value={currentTool}
          exclusive
          onChange={(_, newTool) => newTool && setCurrentTool(newTool)}
          size="small"
        >
          <ToggleButton value="select">
            <Tooltip title="Select"><SelectIcon /></Tooltip>
          </ToggleButton>
          <ToggleButton value="text" onClick={addText}>
            <Tooltip title="Text"><TextIcon /></Tooltip>
          </ToggleButton>
          <ToggleButton 
            value="shape" 
            onClick={(e) => setShapeMenuAnchor(e.currentTarget)}
          >
            <Tooltip title="Shape"><ShapeIcon /></Tooltip>
          </ToggleButton>
          <ToggleButton value="sticky" onClick={addStickyNote}>
            <Tooltip title="Sticky Note"><StickyNoteIcon /></Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Shape Menu */}
        <Menu
          anchorEl={shapeMenuAnchor}
          open={Boolean(shapeMenuAnchor)}
          onClose={() => setShapeMenuAnchor(null)}
        >
          <MenuItem onClick={() => addShape(ShapeType.Rectangle)}>
            <RectangleIcon sx={{ mr: 1 }} /> Rectangle
          </MenuItem>
          <MenuItem onClick={() => addShape(ShapeType.Circle)}>
            <CircleIcon sx={{ mr: 1 }} /> Circle
          </MenuItem>
          <MenuItem onClick={() => addShape(ShapeType.Triangle)}>
            ▲ Triangle
          </MenuItem>
          <MenuItem onClick={() => addShape(ShapeType.Star)}>
            <StarIcon sx={{ mr: 1 }} /> Star
          </MenuItem>
          <MenuItem onClick={() => addShape(ShapeType.Diamond)}>
            <DiamondIcon sx={{ mr: 1 }} /> Diamond
          </MenuItem>
        </Menu>

        <Divider orientation="vertical" flexItem />

        {/* Undo/Redo */}
        <IconButton onClick={handleUndo} disabled={undoStack.length === 0} size="small">
          <Tooltip title="Undo"><UndoIcon /></Tooltip>
        </IconButton>
        <IconButton onClick={handleRedo} disabled={redoStack.length === 0} size="small">
          <Tooltip title="Redo"><RedoIcon /></Tooltip>
        </IconButton>

        <Divider orientation="vertical" flexItem />

        {/* Delete */}
        <IconButton onClick={handleDelete} disabled={!selectedObject} size="small" color="error">
          <Tooltip title="Delete"><DeleteIcon /></Tooltip>
        </IconButton>

        <Divider orientation="vertical" flexItem />

        {/* Zoom Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
          <IconButton onClick={() => handleZoomChange({} as Event, Math.max(0.1, zoom - 0.1))} size="small">
            <ZoomOutIcon />
          </IconButton>
          <Slider
            value={zoom}
            onChange={handleZoomChange}
            min={0.1}
            max={3}
            step={0.1}
            sx={{ flex: 1 }}
          />
          <IconButton onClick={() => handleZoomChange({} as Event, Math.min(3, zoom + 0.1))} size="small">
            <ZoomInIcon />
          </IconButton>
          <Typography variant="caption" sx={{ minWidth: 40 }}>
            {Math.round(zoom * 100)}%
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Grid Toggle */}
        <IconButton onClick={toggleGrid} size="small" color={gridEnabled ? 'primary' : 'default'}>
          <Tooltip title={gridEnabled ? 'Hide Grid' : 'Show Grid'}>
            {gridEnabled ? <GridOnIcon /> : <GridOffIcon />}
          </Tooltip>
        </IconButton>

        <Box sx={{ flex: 1 }} />

        {/* Save Button */}
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          size="small"
        >
          Save
        </Button>
      </Paper>

      {/* Canvas */}
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.100', p: 2 }}>
        <canvas ref={canvasRef} />
      </Box>
    </Box>
  );
};
