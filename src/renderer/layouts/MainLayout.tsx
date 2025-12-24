import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Folder as ProjectsIcon,
  Assignment as TasksIcon,
  People as UsersIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  CropSquare as MaximizeIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  ContentCopy as TemplateIcon,
  Timeline as TimelineIcon,
  Dashboard as VisionBoardIcon,
} from '@mui/icons-material';
import NotificationCenter from '../components/NotificationCenter';

const SIDEBAR_WIDTH = 240;
const TITLEBAR_HEIGHT = 32;

interface MainLayoutProps {
  children: ReactNode;
  onThemeToggle: () => void;
  isDarkMode: boolean;
}

// Custom Title Bar Component (VS Code style)
function TitleBar({ onThemeToggle, isDarkMode }: { onThemeToggle: () => void; isDarkMode: boolean }) {
  const handleMinimize = () => {
    if (window.electronAPI?.windowMinimize) {
      window.electronAPI.windowMinimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI?.windowMaximize) {
      window.electronAPI.windowMaximize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.windowClose) {
      window.electronAPI.windowClose();
    }
  };

  return (
    <Box
      sx={{
        height: TITLEBAR_HEIGHT,
        backgroundColor: '#1e1e1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        borderBottom: '1px solid #2d2d2d',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
      }}
    >
      {/* Left: App Icon & Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)',
            borderRadius: 0.5,
          }}
        />
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#cccccc',
            letterSpacing: 0.3,
          }}
        >
          DevTrack
        </Typography>
      </Box>

      {/* Right: Notifications + Theme Toggle + Window Controls */}
      <Box sx={{ display: 'flex', WebkitAppRegion: 'no-drag' }}>
        <NotificationCenter userId={1} />
        <IconButton
          size="small"
          onClick={onThemeToggle}
          sx={{
            width: 28,
            height: 28,
            borderRadius: 0,
            color: '#cccccc',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
          }}
        >
          {isDarkMode ? <LightModeIcon sx={{ fontSize: 16 }} /> : <DarkModeIcon sx={{ fontSize: 16 }} />}
        </IconButton>
        <IconButton
          size="small"
          onClick={handleMinimize}
          sx={{
            width: 32,
            height: 32,
            borderRadius: 0,
            color: '#cccccc',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
          }}
        >
          <MinimizeIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleMaximize}
          sx={{
            width: 32,
            height: 32,
            borderRadius: 0,
            color: '#cccccc',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
          }}
        >
          <MaximizeIcon sx={{ fontSize: 12 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{
            width: 32,
            height: 32,
            borderRadius: 0,
            color: '#cccccc',
            '&:hover': { backgroundColor: '#e81123', color: '#fff' },
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

export default function MainLayout({ children, onThemeToggle, isDarkMode }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Projects', icon: <ProjectsIcon />, path: '/projects' },
    { text: 'Tasks', icon: <TasksIcon />, path: '/tasks' },
    { text: 'Templates', icon: <TemplateIcon />, path: '/templates' },
    { text: 'Timeline', icon: <TimelineIcon />, path: '/timeline' },
    { text: 'Vision Boards', icon: <VisionBoardIcon />, path: '/vision-boards' },
    { text: 'Users', icon: <UsersIcon />, path: '/users' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#1e1e1e' }}>
      {/* Custom Title Bar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2000,
        }}
      >
        <TitleBar onThemeToggle={onThemeToggle} isDarkMode={isDarkMode} />
      </Box>

      {/* Sidebar */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          backgroundColor: '#252526',
          borderRight: '1px solid #2d2d2d',
          paddingTop: `${TITLEBAR_HEIGHT}px`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo/Brand */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>D</Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 18, color: '#fff' }}>
            DevTrack
          </Typography>
        </Box>

        <Box sx={{ borderTop: '1px solid #2d2d2d', my: 1 }} />

        {/* Navigation */}
        <List sx={{ px: 1, py: 0.5, flex: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 0.5,
                  minHeight: 32,
                  color: '#cccccc',
                  py: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: '#37373d',
                    color: '#fff',
                    '& .MuiListItemIcon-root': { color: '#fff' },
                  },
                  '&:hover': {
                    backgroundColor: '#2a2d2e',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: 13,
                    fontWeight: location.pathname === item.path ? 500 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          backgroundColor: '#1e1e1e',
          paddingTop: `${TITLEBAR_HEIGHT}px`,
          overflow: 'auto',
          // Native scrollbar styling
          '&::-webkit-scrollbar': {
            width: '10px',
            height: '10px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#424242',
            borderRadius: '5px',
            '&:hover': {
              backgroundColor: '#4f4f4f',
            },
          },
        }}
      >
        <Box sx={{ p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
}
