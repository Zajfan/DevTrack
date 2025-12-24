import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Breadcrumbs,
  Link,
  Chip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Folder as ProjectIcon,
} from '@mui/icons-material';
import { VisionBoardEditor } from '../components/VisionBoardEditor';
import { VisionBoard } from '../../main/models/VisionBoard';
import { Project } from '../../main/models';

export const VisionBoardView: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<VisionBoard | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadBoard = async (id: number) => {
      try {
        const loadedBoard = await window.electronAPI.visionBoard.getById(id);
        if (!isMounted) return;

        if (loadedBoard) {
          setBoard(loadedBoard);

          // Load project if linked
          if (loadedBoard.projectId) {
            const proj = await window.electronAPI.project.findById(loadedBoard.projectId);
            if (isMounted) {
              setProject(proj || null);
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load board:', error);
        }
      }
    };

    if (boardId) {
      loadBoard(parseInt(boardId));
    }

    return () => {
      isMounted = false;
    };
  }, [boardId]);

  const loadBoard = async (id: number) => {
    try {
      const loadedBoard = await window.electronAPI.visionBoard.getById(id);
      if (loadedBoard) {
        setBoard(loadedBoard);

        // Load project if linked
        if (loadedBoard.projectId) {
          const proj = await window.electronAPI.project.findById(loadedBoard.projectId);
          setProject(proj || null);
        }
      }
    } catch (error) {
      console.error('Failed to load board:', error);
    }
  };

  const handleSave = () => {
    if (boardId) {
      loadBoard(parseInt(boardId));
    }
  };

  if (!board || !boardId) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => navigate('/vision-boards')}
            sx={{ mr: 2 }}
          >
            <BackIcon />
          </IconButton>

          {/* Breadcrumbs */}
          <Breadcrumbs sx={{ flex: 1 }}>
            <Link
              component="button"
              variant="body1"
              onClick={() => navigate('/vision-boards')}
              sx={{ textDecoration: 'none', color: 'inherit' }}
            >
              Vision Boards
            </Link>
            {project && (
              <Link
                component="button"
                variant="body1"
                onClick={() => navigate(`/projects/${project.id}`)}
                sx={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <ProjectIcon fontSize="small" />
                {project.name}
              </Link>
            )}
            <Typography color="text.primary">{board.name}</Typography>
          </Breadcrumbs>

          {/* Board Type Chip */}
          <Chip label={board.type} size="small" sx={{ ml: 2 }} />
        </Toolbar>
      </AppBar>

      {/* Editor */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <VisionBoardEditor boardId={parseInt(boardId)} onSave={handleSave} />
      </Box>
    </Box>
  );
};
