import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  AttachMoney as AttachMoneyIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import {
  ProjectStatistics,
  UserStatistics,
  TimeStatistics,
  TaskStatusReport,
  TaskPriorityReport,
  ProjectProgressReport,
  UserWorkloadReport,
  TimeTrackingReport,
  DateRange
} from '../types';

interface AnalyticsDashboardProps {
  projectId?: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  
  // Statistics
  const [projectStats, setProjectStats] = useState<ProjectStatistics | null>(null);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [timeStats, setTimeStats] = useState<TimeStatistics | null>(null);
  
  // Reports
  const [statusReport, setStatusReport] = useState<TaskStatusReport[]>([]);
  const [priorityReport, setPriorityReport] = useState<TaskPriorityReport[]>([]);
  const [progressReport, setProgressReport] = useState<ProjectProgressReport[]>([]);
  const [workloadReport, setWorkloadReport] = useState<UserWorkloadReport[]>([]);
  const [timeReport, setTimeReport] = useState<TimeTrackingReport[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      if (isMounted) {
        setLoading(true);
      }
      try {
        const range: DateRange = { period: dateRange };

        // Load statistics
        const [projStats, usrStats, tmStats] = await Promise.all([
          window.electronAPI.analytics.getProjectStatistics(),
          window.electronAPI.analytics.getUserStatistics(),
          window.electronAPI.analytics.getTimeStatistics(range)
        ]);
        if (!isMounted) return;

        setProjectStats(projStats);
        setUserStats(usrStats);
        setTimeStats(tmStats);

        // Load reports
        const filters = projectId ? { projectIds: [projectId] } : undefined;

        const [status, priority, progress, workload, time] = await Promise.all([
          window.electronAPI.analytics.getTaskStatusReport(filters),
          window.electronAPI.analytics.getTaskPriorityReport(filters),
          window.electronAPI.analytics.getProjectProgressReport(projectId ? [projectId] : undefined),
          window.electronAPI.analytics.getUserWorkloadReport(),
          window.electronAPI.analytics.getTimeTrackingReport(range, filters)
        ]);
        if (!isMounted) return;

        setStatusReport(status);
        setPriorityReport(priority);
        setProgressReport(progress);
        setWorkloadReport(workload);
        setTimeReport(time);

      } catch (error) {
        if (isMounted) {
          console.error('Failed to load analytics:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [dateRange, projectId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const range: DateRange = { period: dateRange };

      // Load statistics
      const [projStats, usrStats, tmStats] = await Promise.all([
        window.electronAPI.analytics.getProjectStatistics(),
        window.electronAPI.analytics.getUserStatistics(),
        window.electronAPI.analytics.getTimeStatistics(range)
      ]);

      setProjectStats(projStats);
      setUserStats(usrStats);
      setTimeStats(tmStats);

      // Load reports
      const filters = projectId ? { projectIds: [projectId] } : undefined;

      const [status, priority, progress, workload, time] = await Promise.all([
        window.electronAPI.analytics.getTaskStatusReport(filters),
        window.electronAPI.analytics.getTaskPriorityReport(filters),
        window.electronAPI.analytics.getProjectProgressReport(projectId ? [projectId] : undefined),
        window.electronAPI.analytics.getUserWorkloadReport(),
        window.electronAPI.analytics.getTimeTrackingReport(range, filters)
      ]);

      setStatusReport(status);
      setPriorityReport(priority);
      setProgressReport(progress);
      setWorkloadReport(workload);
      setTimeReport(time);

    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'todo': '#94a3b8',
      'in_progress': '#3b82f6',
      'done': '#10b981',
      'blocked': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      'low': '#10b981',
      'medium': '#f59e0b',
      'high': '#ef4444',
      'critical': '#dc2626'
    };
    return colors[priority] || '#6b7280';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Analytics Dashboard</Typography>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Time Period</InputLabel>
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            label="Time Period"
          >
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="quarter">Last Quarter</MenuItem>
            <MenuItem value="year">Last Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <AssignmentIcon sx={{ fontSize: 40, color: '#3b82f6' }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">Total Tasks</Typography>
                  <Typography variant="h5">{projectStats?.totalTasks || 0}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <CheckCircleIcon sx={{ fontSize: 40, color: '#10b981' }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">Completed</Typography>
                  <Typography variant="h5">{projectStats?.completedTasks || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {projectStats?.totalTasks 
                      ? `${((projectStats.completedTasks / projectStats.totalTasks) * 100).toFixed(1)}%`
                      : '0%'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <ScheduleIcon sx={{ fontSize: 40, color: '#f59e0b' }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">Overdue</Typography>
                  <Typography variant="h5" color="warning.main">
                    {projectStats?.overdueTasks || 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <AttachMoneyIcon sx={{ fontSize: 40, color: '#10b981' }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">Earnings</Typography>
                  <Typography variant="h5">${timeStats?.totalEarnings.toFixed(2) || '0.00'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {timeStats?.billableHours.toFixed(1) || 0}h billable
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Task Status & Priority */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Task Status Distribution</Typography>
              <Box sx={{ mt: 2 }}>
                {statusReport.map((item) => (
                  <Box key={item.status} sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" textTransform="capitalize">
                        {item.status.replace('_', ' ')}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.count} ({item.percentage.toFixed(1)}%)
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        height: 8,
                        bgcolor: '#e5e7eb',
                        borderRadius: 1,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${item.percentage}%`,
                          height: '100%',
                          bgcolor: getStatusColor(item.status),
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Task Priority Distribution</Typography>
              <Box sx={{ mt: 2 }}>
                {priorityReport.map((item) => (
                  <Box key={item.priority} sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" textTransform="capitalize">
                        {item.priority}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.count} ({item.percentage.toFixed(1)}%)
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        height: 8,
                        bgcolor: '#e5e7eb',
                        borderRadius: 1,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${item.percentage}%`,
                          height: '100%',
                          bgcolor: getPriorityColor(item.priority),
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Project Progress */}
      {progressReport.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Project Progress</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Project</TableCell>
                    <TableCell align="right">Total Tasks</TableCell>
                    <TableCell align="right">Completed</TableCell>
                    <TableCell align="right">In Progress</TableCell>
                    <TableCell align="right">To Do</TableCell>
                    <TableCell align="right">Progress</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {progressReport.map((project) => (
                    <TableRow key={project.projectId}>
                      <TableCell>{project.projectName}</TableCell>
                      <TableCell align="right">{project.totalTasks}</TableCell>
                      <TableCell align="right">{project.completedTasks}</TableCell>
                      <TableCell align="right">{project.inProgressTasks}</TableCell>
                      <TableCell align="right">{project.todoTasks}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${project.completionPercentage.toFixed(0)}%`}
                          size="small"
                          color={project.completionPercentage >= 75 ? 'success' : project.completionPercentage >= 50 ? 'primary' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* User Workload */}
      {workloadReport.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>User Workload</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell align="right">Assigned</TableCell>
                    <TableCell align="right">Completed</TableCell>
                    <TableCell align="right">In Progress</TableCell>
                    <TableCell align="right">Overdue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workloadReport.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>{user.userName}</TableCell>
                      <TableCell align="right">{user.assignedTasks}</TableCell>
                      <TableCell align="right">{user.completedTasks}</TableCell>
                      <TableCell align="right">{user.inProgressTasks}</TableCell>
                      <TableCell align="right">
                        {user.overdueTasks > 0 ? (
                          <Chip label={user.overdueTasks} size="small" color="error" />
                        ) : (
                          user.overdueTasks
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Time Tracking */}
      {timeReport.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Time Tracking Summary</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell align="right">Total Hours</TableCell>
                    <TableCell align="right">Billable Hours</TableCell>
                    <TableCell align="right">Earnings</TableCell>
                    <TableCell align="right">Entries</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timeReport.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.userName}</TableCell>
                      <TableCell>{item.projectName}</TableCell>
                      <TableCell align="right">{item.totalHours.toFixed(2)}</TableCell>
                      <TableCell align="right">{item.billableHours.toFixed(2)}</TableCell>
                      <TableCell align="right">${item.earnings.toFixed(2)}</TableCell>
                      <TableCell align="right">{item.entriesCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;
