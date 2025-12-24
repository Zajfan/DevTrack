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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { User, Role, ProjectMemberWithDetails } from '../types';

interface ProjectMembersProps {
  projectId: number;
}

export default function ProjectMembers({ projectId }: ProjectMembersProps) {
  const [members, setMembers] = useState<ProjectMemberWithDetails[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<ProjectMemberWithDetails | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<number>(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, usersData, rolesData] = await Promise.all([
        window.electronAPI.projectMember.findByProjectIdWithDetails(projectId),
        window.electronAPI.user.findActive(),
        window.electronAPI.role.findAll(),
      ]);
      setMembers(membersData);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      console.error('Failed to load project members:', err);
      setError('Failed to load project members');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (member?: ProjectMemberWithDetails) => {
    if (member) {
      setEditMember(member);
      setSelectedRole(member.roleId);
      setSelectedUser(member.user);
    } else {
      setEditMember(null);
      setSelectedRole(roles.find(r => r.name === 'member')?.id || 0);
      setSelectedUser(null);
    }
    setError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMember(null);
    setSelectedUser(null);
    setSelectedRole(0);
    setError('');
  };

  const handleSave = async () => {
    try {
      if (editMember) {
        // Update role
        await window.electronAPI.projectMember.updateRole(editMember.id, selectedRole);
      } else {
        // Add new member
        if (!selectedUser) {
          setError('Please select a user');
          return;
        }
        if (!selectedRole) {
          setError('Please select a role');
          return;
        }

        // Check if user is already a member
        const isMember = await window.electronAPI.projectMember.isMember(projectId, selectedUser.id);
        if (isMember) {
          setError('User is already a member of this project');
          return;
        }

        await window.electronAPI.projectMember.create({
          projectId,
          userId: selectedUser.id,
          roleId: selectedRole,
        });
      }
      await loadData();
      handleCloseDialog();
    } catch (err) {
      console.error('Failed to save member:', err);
      setError('Failed to save member');
    }
  };

  const handleDelete = async (memberId: number) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    try {
      await window.electronAPI.projectMember.delete(memberId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete member:', err);
      setError('Failed to remove member');
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <AdminIcon />;
      case 'member':
        return <PersonIcon />;
      case 'viewer':
        return <ViewIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getRoleColor = (roleName: string): "error" | "warning" | "info" | "success" | "default" | "primary" | "secondary" => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'error';
      case 'member':
        return 'primary';
      case 'viewer':
        return 'info';
      default:
        return 'default';
    }
  };

  const availableUsers = users.filter(
    user => !members.some(m => m.userId === user.id)
  );

  if (loading) {
    return <Typography>Loading members...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon color="primary" />
          <Typography variant="h6">Project Members</Typography>
          <Chip label={members.length} size="small" color="primary" />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Member
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
              <TableCell>Role</TableCell>
              <TableCell>Added</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {member.user.displayName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {member.user.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @{member.user.username}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{member.user.email}</TableCell>
                <TableCell>
                  <Chip
                    icon={getRoleIcon(member.role.name)}
                    label={member.role.name}
                    color={getRoleColor(member.role.name)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(member.addedAt).toLocaleDateString()}
                  </Typography>
                  {member.addedByUser && (
                    <Typography variant="caption" color="text.secondary">
                      by {member.addedByUser.displayName}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(member)}
                    title="Change role"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(member.id)}
                    title="Remove member"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">
                    No members yet. Click "Add Member" to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Member Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMember ? 'Change Member Role' : 'Add Project Member'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!editMember && (
            <Autocomplete
              options={availableUsers}
              getOptionLabel={(user) => `${user.displayName} (@${user.username})`}
              value={selectedUser}
              onChange={(_, newValue) => setSelectedUser(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select User"
                  margin="normal"
                  fullWidth
                  required
                />
              )}
              sx={{ mb: 2 }}
            />
          )}

          {editMember && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Changing role for:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {editMember.user.displayName[0]}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {editMember.user.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{editMember.user.username}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={selectedRole}
              label="Role"
              onChange={(e) => setSelectedRole(Number(e.target.value))}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRoleIcon(role.name)}
                    <Box>
                      <Typography variant="body2">{role.name}</Typography>
                      {role.description && (
                        <Typography variant="caption" color="text.secondary">
                          {role.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editMember ? 'Update Role' : 'Add Member'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
