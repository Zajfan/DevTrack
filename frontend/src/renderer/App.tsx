import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useState } from 'react';
import Layout from './layouts/MainLayout';
import Dashboard from './views/Dashboard';
import Projects from './views/Projects';
import ProjectDetail from './views/ProjectDetail';
import Settings from './views/Settings';

// Desktop-optimized VS Code-inspired theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1e40af',
    },
    secondary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    background: {
      default: '#1e1e1e', // VS Code dark background
      paper: '#252526',   // VS Code sidebar
    },
    divider: '#2d2d2d',
    text: {
      primary: '#cccccc',
      secondary: '#999999',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 13, // Desktop apps use smaller fonts
    button: {
      textTransform: 'none', // No uppercase
      fontWeight: 500,
    },
    h6: {
      fontSize: '1.1rem',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 4, // Subtle rounded corners
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default gradient
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #2d2d2d',
        },
      },
    },
  },
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1e40af',
    },
    secondary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
    divider: '#e0e0e0',
    text: {
      primary: '#1e1e1e',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 13,
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1.1rem',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #e0e0e0',
        },
      },
    },
  },
});

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout onThemeToggle={toggleTheme} isDarkMode={isDarkMode}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
