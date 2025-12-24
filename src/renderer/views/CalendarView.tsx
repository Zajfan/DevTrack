import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  ButtonGroup,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  CalendarViewMonth as MonthIcon,
  CalendarViewWeek as WeekIcon,
  CalendarViewDay as DayIcon,
} from '@mui/icons-material';
import { Task, TaskStatus, TaskPriority } from '../types';

type CalendarMode = 'month' | 'week' | 'day';

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  tasks: Task[];
}

export const CalendarView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '0', 10);
  const [mode, setMode] = useState<CalendarMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      try {
        const allTasks = await window.electronAPI.task.findByProjectId(projectId);
        if (isMounted) {
          setTasks(allTasks);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load tasks:', error);
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const loadTasks = async () => {
    try {
      const allTasks = await window.electronAPI.task.findByProjectId(projectId);
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (mode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (mode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getMonthCalendar = (): DayCell[][] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const weeks: DayCell[][] = [];
    let currentWeek: DayCell[] = [];
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
        return taskDate === dateStr;
      });
      
      currentWeek.push({
        date: new Date(d),
        isCurrentMonth: d.getMonth() === month,
        tasks: dayTasks,
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    return weeks;
  };

  const getWeekDays = (): DayCell[] => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    const days: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
        return taskDate === dateStr;
      });
      
      days.push({
        date,
        isCurrentMonth: true,
        tasks: dayTasks,
      });
    }
    
    return days;
  };

  const getDayTasks = (): Task[] => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
      return taskDate === dateStr;
    });
  };

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case TaskPriority.Critical: return '#d32f2f';
      case TaskPriority.High: return '#f57c00';
      case TaskPriority.Medium: return '#1976d2';
      case TaskPriority.Low: return '#388e3c';
      default: return '#757575';
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.Todo: return '#9e9e9e';
      case TaskStatus.InProgress: return '#2196f3';
      case TaskStatus.Review: return '#ff9800';
      case TaskStatus.Done: return '#4caf50';
      case TaskStatus.Blocked: return '#f44336';
      default: return '#757575';
    }
  };

  const formatDate = (date: Date): string => {
    if (mode === 'month') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (mode === 'week') {
      const endOfWeek = new Date(date);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const renderMonthView = () => {
    const weeks = getMonthCalendar();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <Box>
        <Grid container spacing={1} sx={{ mb: 1 }}>
          {weekDays.map(day => (
            <Grid item xs key={day}>
              <Typography variant="body2" align="center" fontWeight="bold">
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>
        
        {weeks.map((week, weekIdx) => (
          <Grid container spacing={1} key={weekIdx} sx={{ mb: 1 }}>
            {week.map((day, dayIdx) => (
              <Grid item xs key={dayIdx}>
                <Paper
                  sx={{
                    p: 1,
                    minHeight: 100,
                    backgroundColor: day.isCurrentMonth ? 'background.paper' : 'action.hover',
                    opacity: day.isCurrentMonth ? 1 : 0.5,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <Typography variant="body2" fontWeight={day.date.toDateString() === new Date().toDateString() ? 'bold' : 'normal'}>
                    {day.date.getDate()}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {day.tasks.slice(0, 3).map(task => (
                      <Tooltip key={task.id} title={task.title}>
                        <Chip
                          label={task.title}
                          size="small"
                          sx={{
                            mb: 0.5,
                            width: '100%',
                            backgroundColor: getPriorityColor(task.priority),
                            color: 'white',
                            fontSize: '0.7rem',
                            height: 20,
                            '& .MuiChip-label': {
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            },
                          }}
                        />
                      </Tooltip>
                    ))}
                    {day.tasks.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{day.tasks.length - 3} more
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ))}
      </Box>
    );
  };

  const renderWeekView = () => {
    const days = getWeekDays();
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <Grid container spacing={2}>
        {days.map((day, idx) => (
          <Grid item xs key={idx}>
            <Paper sx={{ p: 2, minHeight: 400 }}>
              <Typography variant="h6" gutterBottom>
                {weekDays[idx]}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Typography>
              <Box sx={{ mt: 2 }}>
                {day.tasks.map(task => (
                  <Card key={task.id} sx={{ mb: 1, cursor: 'pointer' }} onClick={() => setSelectedTask(task)}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="body2" fontWeight="bold">
                        {task.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        <Chip
                          label={task.priority}
                          size="small"
                          sx={{ backgroundColor: getPriorityColor(task.priority), color: 'white', fontSize: '0.65rem', height: 18 }}
                        />
                        <Chip
                          label={task.status.replace('_', ' ')}
                          size="small"
                          sx={{ backgroundColor: getStatusColor(task.status), color: 'white', fontSize: '0.65rem', height: 18 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderDayView = () => {
    const dayTasks = getDayTasks();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Tasks for {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Typography>
        
        {dayTasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No tasks scheduled for this day
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            {dayTasks.map(task => (
              <Card key={task.id} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => setSelectedTask(task)}>
                <CardContent>
                  <Typography variant="h6">{task.title}</Typography>
                  {task.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {task.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip
                      label={task.priority}
                      size="small"
                      sx={{ backgroundColor: getPriorityColor(task.priority), color: 'white' }}
                    />
                    <Chip
                      label={task.status.replace('_', ' ')}
                      size="small"
                      sx={{ backgroundColor: getStatusColor(task.status), color: 'white' }}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Calendar View</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ButtonGroup size="small">
            <Button
              variant={mode === 'month' ? 'contained' : 'outlined'}
              onClick={() => setMode('month')}
              startIcon={<MonthIcon />}
            >
              Month
            </Button>
            <Button
              variant={mode === 'week' ? 'contained' : 'outlined'}
              onClick={() => setMode('week')}
              startIcon={<WeekIcon />}
            >
              Week
            </Button>
            <Button
              variant={mode === 'day' ? 'contained' : 'outlined'}
              onClick={() => setMode('day')}
              startIcon={<DayIcon />}
            >
              Day
            </Button>
          </ButtonGroup>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton onClick={() => navigateDate('prev')}>
              <ChevronLeftIcon />
            </IconButton>
            <Button variant="outlined" onClick={goToToday} startIcon={<TodayIcon />}>
              Today
            </Button>
            <IconButton onClick={() => navigateDate('next')}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Typography variant="h5" align="center" gutterBottom>
        {formatDate(currentDate)}
      </Typography>

      {mode === 'month' && renderMonthView()}
      {mode === 'week' && renderWeekView()}
      {mode === 'day' && renderDayView()}
    </Box>
  );
};
