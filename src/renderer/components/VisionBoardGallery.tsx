import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Button,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  Folder as ProjectIcon,
  Dashboard as DashboardIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  VisionBoard,
  VisionBoardType,
  VisionBoardStatus,
  CreateVisionBoardData,
  VISION_BOARD_TEMPLATES,
} from '../../main/models/VisionBoard';
import { Project } from '../../main/models';

export const VisionBoardGallery: React.FC = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<VisionBoard[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<VisionBoard | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [newBoardType, setNewBoardType] = useState<VisionBoardType>(VisionBoardType.Canvas);
  const [newBoardProject, setNewBoardProject] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(4); // Blank canvas
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; boardId: number } | null>(null);
  const [filterType, setFilterType] = useState<VisionBoardType | 'all'>('all');
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');

  useEffect(() => {
    loadBoards();
    loadProjects();
  }, []);

  const loadBoards = async () => {
    try {
      const allBoards = await window.electronAPI.visionBoard.getAll();
      setBoards(allBoards);
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const allProjects = await window.electronAPI.project.findAll();
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleCreateBoard = async () => {
    try {
      console.log('Creating board with:', { newBoardName, selectedTemplate, newBoardProject });
      const userId = 1; // TODO: Get from auth context
      
      if (selectedTemplate < VISION_BOARD_TEMPLATES.length) {
        // Create from template
        const template = VISION_BOARD_TEMPLATES[selectedTemplate];
        console.log('Creating from template:', template.name);
        const result = await window.electronAPI.visionBoard.createFromTemplate(
          template,
          newBoardName || template.name,
          userId,
          newBoardProject || undefined
        );
        console.log('Created board from template:', result);
        navigate(`/vision-boards/${result.board.id}`);
      } else {
        // Create blank board
        const boardData: CreateVisionBoardData = {
          name: newBoardName,
          description: newBoardDescription,
          type: newBoardType,
          projectId: newBoardProject,
        };
        
        console.log('Creating blank board with data:', boardData);
        const board = await window.electronAPI.visionBoard.create(boardData, userId);
        console.log('Created board:', board);
        navigate(`/vision-boards/${board.id}`);
      }
      
      setCreateDialogOpen(false);
      resetCreateDialog();
    } catch (error) {
      console.error('Failed to create board:', error);
      alert('Failed to create vision board: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleEdit = (boardId: number) => {
    const board = boards.find(b => b.id === boardId);
    if (!board) return;

    setEditingBoard(board);
    setNewBoardName(board.name);
    setNewBoardDescription(board.description || '');
    setNewBoardType(board.type);
    setNewBoardProject(board.projectId || null);
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleUpdateBoard = async () => {
    if (!editingBoard || !newBoardName.trim()) return;

    try {
      await window.electronAPI.visionBoard.update(editingBoard.id, {
        name: newBoardName,
        description: newBoardDescription || undefined,
        type: newBoardType,
        projectId: newBoardProject,
      });

      setEditDialogOpen(false);
      setEditingBoard(null);
      resetCreateDialog();
      loadBoards();
    } catch (error) {
      console.error('Failed to update board:', error);
      alert('Failed to update vision board: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDuplicate = async (boardId: number) => {
    try {
      const userId = 1; // TODO: Get from auth context
      const original = boards.find(b => b.id === boardId);
      if (!original) return;

      const duplicate = await window.electronAPI.visionBoard.duplicate(
        boardId,
        `${original.name} (Copy)`,
        userId
      );
      
      if (duplicate) {
        loadBoards();
      }
    } catch (error) {
      console.error('Failed to duplicate board:', error);
    }
    setMenuAnchor(null);
  };

  const handleDelete = async (boardId: number) => {
    if (!confirm('Are you sure you want to delete this vision board?')) return;

    try {
      await window.electronAPI.visionBoard.delete(boardId);
      loadBoards();
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
    setMenuAnchor(null);
  };

  const resetCreateDialog = () => {
    setNewBoardName('');
    setNewBoardDescription('');
    setNewBoardType(VisionBoardType.Canvas);
    setNewBoardProject(null);
    setSelectedTemplate(4);
  };

  const getFilteredBoards = () => {
    return boards.filter(board => {
      if (filterType !== 'all' && board.type !== filterType) return false;
      if (filterProject !== 'all') {
        if (filterProject === null && board.projectId !== null) return false;
        if (filterProject !== null && board.projectId !== filterProject) return false;
      }
      return true;
    });
  };

  const getBoardTypeColor = (type: VisionBoardType): string => {
    switch (type) {
      case VisionBoardType.Roadmap: return 'primary';
      case VisionBoardType.MindMap: return 'secondary';
      case VisionBoardType.Canvas: return 'default';
      case VisionBoardType.Wireframe: return 'info';
      case VisionBoardType.Architecture: return 'warning';
      case VisionBoardType.UserFlow: return 'success';
      default: return 'default';
    }
  };

  const getProjectName = (projectId: number | null): string => {
    if (!projectId) return 'No Project';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const filteredBoards = getFilteredBoards();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Vision Boards</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Vision Board
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          select
          label="Type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as VisionBoardType | 'all')}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">All Types</MenuItem>
          <MenuItem value={VisionBoardType.Roadmap}>Roadmap</MenuItem>
          <MenuItem value={VisionBoardType.MindMap}>Mind Map</MenuItem>
          <MenuItem value={VisionBoardType.Canvas}>Canvas</MenuItem>
          <MenuItem value={VisionBoardType.Wireframe}>Wireframe</MenuItem>
          <MenuItem value={VisionBoardType.Architecture}>Architecture</MenuItem>
          <MenuItem value={VisionBoardType.UserFlow}>User Flow</MenuItem>
        </TextField>

        <TextField
          select
          label="Project"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">All Projects</MenuItem>
          <MenuItem value={null as any}>No Project</MenuItem>
          {projects.map(project => (
            <MenuItem key={project.id} value={project.id}>
              {project.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Board Grid */}
      {filteredBoards.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <DashboardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No vision boards yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Create your first vision board to start visualizing your project vision
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Vision Board
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredBoards.map(board => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={board.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Thumbnail */}
                <CardMedia
                  sx={{
                    height: 200,
                    bgcolor: 'grey.200',
                    cursor: 'pointer',
                    backgroundSize: 'cover',
                  }}
                  image={board.thumbnail || undefined}
                  title={board.name}
                  onClick={() => navigate(`/vision-boards/${board.id}`)}
                />

                <CardContent sx={{ flex: 1 }}>
                  {/* Title */}
                  <Typography variant="h6" gutterBottom noWrap>
                    {board.name}
                  </Typography>

                  {/* Description */}
                  {board.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {board.description}
                    </Typography>
                  )}

                  {/* Chips */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip
                      label={board.type}
                      size="small"
                      color={getBoardTypeColor(board.type) as any}
                    />
                    {board.projectId && (
                      <Chip
                        icon={<ProjectIcon />}
                        label={getProjectName(board.projectId)}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  {/* Date */}
                  <Typography variant="caption" color="text.secondary">
                    Updated {new Date(board.updatedAt).toLocaleDateString()}
                  </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Button
                    size="small"
                    onClick={() => navigate(`/vision-boards/${board.id}`)}
                  >
                    Open
                  </Button>
                  <IconButton
                    size="small"
                    onClick={(e) => setMenuAnchor({ element: e.currentTarget, boardId: board.id })}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => menuAnchor && navigate(`/vision-boards/${menuAnchor.boardId}`)}>
          <ListItemIcon><OpenInNewIcon /></ListItemIcon>
          <ListItemText>Open</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleEdit(menuAnchor.boardId)}>
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Edit Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleDuplicate(menuAnchor.boardId)}>
          <ListItemIcon><DuplicateIcon /></ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleDelete(menuAnchor.boardId)}>
          <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Board Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetCreateDialog();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Vision Board</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Template Selection */}
            <TextField
              select
              label="Template"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(Number(e.target.value))}
              fullWidth
            >
              {VISION_BOARD_TEMPLATES.map((template, index) => (
                <MenuItem key={index} value={index}>
                  <Box>
                    <Typography variant="body1">{template.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {template.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            {/* Name */}
            <TextField
              label="Board Name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder={selectedTemplate < VISION_BOARD_TEMPLATES.length 
                ? VISION_BOARD_TEMPLATES[selectedTemplate].name 
                : 'My Vision Board'}
              fullWidth
              required
            />

            {/* Description */}
            <TextField
              label="Description"
              value={newBoardDescription}
              onChange={(e) => setNewBoardDescription(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />

            {/* Type (only for blank canvas) */}
            {selectedTemplate === 4 && (
              <TextField
                select
                label="Board Type"
                value={newBoardType}
                onChange={(e) => setNewBoardType(e.target.value as VisionBoardType)}
                fullWidth
              >
                <MenuItem value={VisionBoardType.Canvas}>Canvas</MenuItem>
                <MenuItem value={VisionBoardType.Roadmap}>Roadmap</MenuItem>
                <MenuItem value={VisionBoardType.MindMap}>Mind Map</MenuItem>
                <MenuItem value={VisionBoardType.Wireframe}>Wireframe</MenuItem>
                <MenuItem value={VisionBoardType.Architecture}>Architecture</MenuItem>
                <MenuItem value={VisionBoardType.UserFlow}>User Flow</MenuItem>
                <MenuItem value={VisionBoardType.Custom}>Custom</MenuItem>
              </TextField>
            )}

            {/* Project */}
            <TextField
              select
              label="Link to Project (Optional)"
              value={newBoardProject || ''}
              onChange={(e) => setNewBoardProject(e.target.value ? Number(e.target.value) : null)}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {projects.map(project => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            resetCreateDialog();
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateBoard}
            variant="contained"
            disabled={!newBoardName && selectedTemplate === 4}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Board Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingBoard(null);
          resetCreateDialog();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Vision Board Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Name */}
            <TextField
              label="Board Name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              fullWidth
              required
            />

            {/* Description */}
            <TextField
              label="Description"
              value={newBoardDescription}
              onChange={(e) => setNewBoardDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            {/* Type */}
            <TextField
              select
              label="Board Type"
              value={newBoardType}
              onChange={(e) => setNewBoardType(e.target.value as VisionBoardType)}
              fullWidth
            >
              <MenuItem value={VisionBoardType.Canvas}>Canvas</MenuItem>
              <MenuItem value={VisionBoardType.Roadmap}>Roadmap</MenuItem>
              <MenuItem value={VisionBoardType.MindMap}>Mind Map</MenuItem>
              <MenuItem value={VisionBoardType.Wireframe}>Wireframe</MenuItem>
              <MenuItem value={VisionBoardType.Architecture}>Architecture</MenuItem>
              <MenuItem value={VisionBoardType.UserFlow}>User Flow</MenuItem>
              <MenuItem value={VisionBoardType.Custom}>Custom</MenuItem>
            </TextField>

            {/* Project */}
            <TextField
              select
              label="Link to Project (Optional)"
              value={newBoardProject || ''}
              onChange={(e) => setNewBoardProject(e.target.value ? Number(e.target.value) : null)}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {projects.map(project => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialogOpen(false);
            setEditingBoard(null);
            resetCreateDialog();
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateBoard}
            variant="contained"
            disabled={!newBoardName.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
