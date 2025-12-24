import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Avatar,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { User, CreateUserData } from '../types';
import { ERROR_MESSAGES } from '../constants/errorMessages';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    email: '',
    displayName: '',
    avatarUrl: '',
    isActive: true,
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      if (isMounted) {
        setLoading(true);
      }
      try {
        const data = await window.electronAPI.user.findAll();
        if (isMounted) {
          setUsers(data);
        }
      } catch (err) {
        if (isMounted) {
          console.error(ERROR_MESSAGES.LOAD_USERS_FAILED, err);
          setError(ERROR_MESSAGES.LOAD_USERS_FAILED);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.user.findAll();
      setUsers(data);
    } catch (err) {
      console.error(ERROR_MESSAGES.LOAD_USERS_FAILED, err);
      setError(ERROR_MESSAGES.LOAD_USERS_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || '',
        isActive: user.isActive,
      });
    } else {
      setEditUser(null);
      setFormData({
        username: '',
        email: '',
        displayName: '',
        avatarUrl: '',
        isActive: true,
      });
    }
    setError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditUser(null);
    setFormData({
      username: '',
      email: '',
      displayName: '',
      avatarUrl: '',
      isActive: true,
    });
    setError('');
  };

  const handleSave = async () => {
    try {
      if (!formData.username || !formData.email || !formData.displayName) {
        setError(ERROR_MESSAGES.USER_FIELDS_REQUIRED);
        return;
      }

      if (editUser) {
        await window.electronAPI.user.update(editUser.id, formData);
      } else {
        await window.electronAPI.user.create(formData);
      }
      await loadUsers();
      handleCloseDialog();
    } catch (err) {
      console.error(ERROR_MESSAGES.SAVE_USER_FAILED, err);
      setError(ERROR_MESSAGES.SAVE_USER_FAILED);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await window.electronAPI.user.delete(userId);
      await loadUsers();
    } catch (err) {
      console.error(ERROR_MESSAGES.DELETE_USER_FAILED, err);
      setError(ERROR_MESSAGES.DELETE_USER_FAILED);
    }
  };

  if (loading) {
    return <Typography>Loading users...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Users
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage user accounts and permissions
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add User
        </Button>
      </Box>

      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                      {user.displayName[0]}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.displayName}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    @{user.username}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? 'Active' : 'Inactive'}
                    color={user.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(user)}
                    title="Edit user"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(user.id)}
                    title="Delete user"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    No users yet. Click "Add User" to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editUser ? 'Edit User' : 'Add User'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Display Name"
            fullWidth
            margin="normal"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            required
          />

          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />

          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <TextField
            label="Avatar URL (optional)"
            fullWidth
            margin="normal"
            value={formData.avatarUrl}
            onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
