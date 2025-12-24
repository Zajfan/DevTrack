import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Chip,
  Stack,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Today as TodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays, addWeeks, addMonths, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, isToday, isSameDay } from 'date-fns';
import { Task, TaskDependency } from '../types';

type ViewMode = 'day' | 'week' | 'month';

interface GanttChartProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: (taskId: number, startDate: Date, dueDate: Date) => void;
  projectId?: number;
}

interface GanttTask {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  startDate: Date;
  dueDate: Date;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  position: number;
  level: number;
  dependsOn: number[];
  blocks: number[];
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  dependencies,
  onTaskClick,
  onTaskUpdate,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);

  // Constants
  const ROW_HEIGHT = 40;
  const HEADER_HEIGHT = 80;
  const TASK_BAR_HEIGHT = 28;
  const LABEL_WIDTH = 250;
  const DAY_WIDTH = viewMode === 'day' ? 80 : viewMode === 'week' ? 40 : 20;

  // Prepare tasks with dates
  const ganttTasks: GanttTask[] = useMemo(() => {
    return tasks
      .filter(task => task.startDate && task.dueDate)
      .map((task, index) => {
        const dependsOn = dependencies
          .filter(dep => dep.taskId === task.id && dep.dependencyType === 'blocks')
          .map(dep => dep.dependsOnTaskId);
        
        const blocks = dependencies
          .filter(dep => dep.dependsOnTaskId === task.id && dep.dependencyType === 'blocks')
          .map(dep => dep.taskId);

        return {
          ...task,
          startDate: new Date(task.startDate!),
          dueDate: new Date(task.dueDate!),
          level: 0,
          dependsOn,
          blocks,
        };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [tasks, dependencies]);

  // Calculate date range
  const dateRange = useMemo(() => {
    if (ganttTasks.length === 0) {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(addWeeks(currentDate, 3));
      return { start, end };
    }

    const taskDates = ganttTasks.flatMap(t => [t.startDate, t.dueDate]);
    const minDate = new Date(Math.min(...taskDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...taskDates.map(d => d.getTime())));

    // Add padding
    const start = startOfWeek(addWeeks(minDate, -1));
    const end = endOfWeek(addWeeks(maxDate, 1));

    return { start, end };
  }, [ganttTasks, currentDate]);

  // Generate time columns
  const timeColumns = useMemo(() => {
    if (viewMode === 'day') {
      return eachDayOfInterval(dateRange).map(date => ({
        date,
        label: format(date, 'MMM d'),
        subLabel: format(date, 'EEE'),
      }));
    } else if (viewMode === 'week') {
      const weeks = eachWeekOfInterval(dateRange);
      return weeks.map(weekStart => ({
        date: weekStart,
        label: format(weekStart, 'MMM d'),
        subLabel: `Week ${format(weekStart, 'w')}`,
      }));
    } else {
      const months = eachMonthOfInterval(dateRange);
      return months.map(monthStart => ({
        date: monthStart,
        label: format(monthStart, 'MMM yyyy'),
        subLabel: '',
      }));
    }
  }, [dateRange, viewMode]);

  // Calculate task position
  const getTaskPosition = (task: GanttTask) => {
    const startOffset = differenceInDays(task.startDate, dateRange.start);
    const duration = differenceInDays(task.dueDate, task.startDate) + 1;
    
    return {
      x: startOffset * DAY_WIDTH,
      width: Math.max(duration * DAY_WIDTH, 20),
    };
  };

  // Get task color based on status
  const getTaskColor = (task: GanttTask) => {
    if (task.status === 'done') return '#4caf50';
    if (task.status === 'in_progress') return '#2196f3';
    if (task.priority === 'critical') return '#f44336';
    if (task.priority === 'high') return '#ff9800';
    return '#9e9e9e';
  };

  // Handle drag start
  const handleDragStart = (taskId: number, e: React.MouseEvent) => {
    setDraggedTask(taskId);
    setDragStartX(e.clientX);
    const task = ganttTasks.find(t => t.id === taskId);
    if (task) {
      setDragStartDate(new Date(task.startDate));
    }
  };

  // Handle drag move
  const handleDragMove = (e: React.MouseEvent) => {
    if (draggedTask === null || dragStartX === null || dragStartDate === null) return;

    const deltaX = e.clientX - dragStartX;
    const deltaDays = Math.round(deltaX / DAY_WIDTH);
    
    // Update task position visually (simplified, real implementation would update state)
    const task = ganttTasks.find(t => t.id === draggedTask);
    if (task && deltaDays !== 0) {
      const newStartDate = addDays(dragStartDate, deltaDays);
      const duration = differenceInDays(task.dueDate, task.startDate);
      const newDueDate = addDays(newStartDate, duration);
      
      // Visual feedback could be added here
    }
  };

  // Handle drag end
  const handleDragEnd = (e: React.MouseEvent) => {
    if (draggedTask === null || dragStartX === null || dragStartDate === null) return;

    const deltaX = e.clientX - dragStartX;
    const deltaDays = Math.round(deltaX / DAY_WIDTH);
    
    if (deltaDays !== 0 && onTaskUpdate) {
      const task = ganttTasks.find(t => t.id === draggedTask);
      if (task) {
        const newStartDate = addDays(dragStartDate, deltaDays);
        const duration = differenceInDays(task.dueDate, task.startDate);
        const newDueDate = addDays(newStartDate, duration);
        
        onTaskUpdate(draggedTask, newStartDate, newDueDate);
      }
    }

    setDraggedTask(null);
    setDragStartX(null);
    setDragStartDate(null);
  };

  // Navigation handlers
  const handlePrevious = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, -7));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, -4));
    else setCurrentDate(addMonths(currentDate, -3));
  };

  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 7));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 4));
    else setCurrentDate(addMonths(currentDate, 3));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calculate critical path (simplified)
  const criticalPath = useMemo(() => {
    // Simple algorithm: tasks with dependencies that form the longest chain
    const taskIds = new Set<number>();
    
    ganttTasks.forEach(task => {
      if (task.blocks.length > 0) {
        taskIds.add(task.id);
        task.blocks.forEach(id => taskIds.add(id));
      }
    });
    
    return taskIds;
  }, [ganttTasks]);

  // Render dependency arrows
  const renderDependencyArrows = () => {
    const arrows: JSX.Element[] = [];
    
    ganttTasks.forEach((task, taskIndex) => {
      task.dependsOn.forEach(depId => {
        const depTask = ganttTasks.find(t => t.id === depId);
        if (!depTask) return;
        
        const depIndex = ganttTasks.findIndex(t => t.id === depId);
        const depPos = getTaskPosition(depTask);
        const taskPos = getTaskPosition(task);
        
        const y1 = HEADER_HEIGHT + depIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        const y2 = HEADER_HEIGHT + taskIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        const x1 = LABEL_WIDTH + depPos.x + depPos.width;
        const x2 = LABEL_WIDTH + taskPos.x;
        
        const isCritical = criticalPath.has(task.id) && criticalPath.has(depId);
        
        arrows.push(
          <g key={`dep-${depId}-${task.id}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isCritical ? '#f44336' : '#666'}
              strokeWidth={isCritical ? 2 : 1}
              strokeDasharray={isCritical ? '0' : '4,4'}
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      });
    });
    
    return arrows;
  };

  // Render today marker
  const renderTodayMarker = () => {
    const today = new Date();
    if (today < dateRange.start || today > dateRange.end) return null;
    
    const offset = differenceInDays(today, dateRange.start);
    const x = LABEL_WIDTH + offset * DAY_WIDTH;
    
    return (
      <line
        x1={x}
        y1={HEADER_HEIGHT}
        x2={x}
        y2={HEADER_HEIGHT + ganttTasks.length * ROW_HEIGHT}
        stroke="#2196f3"
        strokeWidth={2}
        strokeDasharray="4,4"
        opacity={0.5}
      />
    );
  };

  const chartWidth = LABEL_WIDTH + timeColumns.length * (viewMode === 'day' ? DAY_WIDTH : viewMode === 'week' ? DAY_WIDTH * 7 : DAY_WIDTH * 30);
  const chartHeight = HEADER_HEIGHT + ganttTasks.length * ROW_HEIGHT;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Timeline View
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton size="small" onClick={handlePrevious}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={handleToday}>
            <TodayIcon />
          </IconButton>
          <IconButton size="small" onClick={handleNext}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="day">Day</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
        </ToggleButtonGroup>

        <Chip
          label={`${ganttTasks.length} tasks`}
          size="small"
          color="primary"
          variant="outlined"
        />
      </Paper>

      {/* Gantt Chart */}
      <Paper sx={{ flexGrow: 1, overflow: 'auto', position: 'relative' }}>
        {ganttTasks.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No tasks with dates available for timeline view.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Add start and due dates to tasks to see them on the timeline.
            </Typography>
          </Box>
        ) : (
          <svg
            width={chartWidth}
            height={chartHeight}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            style={{ display: 'block' }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#666" />
              </marker>
            </defs>

            {/* Header background */}
            <rect
              x={0}
              y={0}
              width={chartWidth}
              height={HEADER_HEIGHT}
              fill="#f5f5f5"
            />

            {/* Time column headers */}
            {timeColumns.map((col, index) => {
              const x = LABEL_WIDTH + index * (viewMode === 'day' ? DAY_WIDTH : viewMode === 'week' ? DAY_WIDTH * 7 : DAY_WIDTH * 30);
              const width = viewMode === 'day' ? DAY_WIDTH : viewMode === 'week' ? DAY_WIDTH * 7 : DAY_WIDTH * 30;
              const isCurrentDay = isToday(col.date);
              
              return (
                <g key={index}>
                  <rect
                    x={x}
                    y={0}
                    width={width}
                    height={HEADER_HEIGHT}
                    fill={isCurrentDay ? '#e3f2fd' : 'transparent'}
                    stroke="#ddd"
                    strokeWidth={1}
                  />
                  <text
                    x={x + width / 2}
                    y={HEADER_HEIGHT / 2 - 8}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={isCurrentDay ? 'bold' : 'normal'}
                    fill={isCurrentDay ? '#2196f3' : '#333'}
                  >
                    {col.label}
                  </text>
                  {col.subLabel && (
                    <text
                      x={x + width / 2}
                      y={HEADER_HEIGHT / 2 + 8}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#666"
                    >
                      {col.subLabel}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Task label column */}
            <rect
              x={0}
              y={HEADER_HEIGHT}
              width={LABEL_WIDTH}
              height={ganttTasks.length * ROW_HEIGHT}
              fill="#fafafa"
              stroke="#ddd"
              strokeWidth={1}
            />

            {/* Grid lines */}
            {ganttTasks.map((_, index) => (
              <line
                key={`grid-${index}`}
                x1={0}
                y1={HEADER_HEIGHT + index * ROW_HEIGHT}
                x2={chartWidth}
                y2={HEADER_HEIGHT + index * ROW_HEIGHT}
                stroke="#eee"
                strokeWidth={1}
              />
            ))}

            {/* Today marker */}
            {renderTodayMarker()}

            {/* Dependency arrows */}
            {renderDependencyArrows()}

            {/* Task bars */}
            {ganttTasks.map((task, index) => {
              const pos = getTaskPosition(task);
              const y = HEADER_HEIGHT + index * ROW_HEIGHT + (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2;
              const color = getTaskColor(task);
              const isCritical = criticalPath.has(task.id);
              const isDragging = draggedTask === task.id;
              
              return (
                <g key={task.id}>
                  {/* Task label */}
                  <text
                    x={10}
                    y={HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2 + 4}
                    fontSize={12}
                    fill="#333"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      const originalTask = tasks.find(t => t.id === task.id);
                      if (originalTask) onTaskClick?.(originalTask);
                    }}
                  >
                    {task.title.length > 30 ? `${task.title.substring(0, 30)}...` : task.title}
                  </text>

                  {/* Task bar */}
                  <rect
                    x={LABEL_WIDTH + pos.x}
                    y={y}
                    width={pos.width}
                    height={TASK_BAR_HEIGHT}
                    rx={4}
                    fill={color}
                    opacity={isDragging ? 0.6 : task.status === 'done' ? 0.7 : 1}
                    stroke={isCritical ? '#f44336' : 'transparent'}
                    strokeWidth={isCritical ? 2 : 0}
                    style={{ cursor: 'move' }}
                    onMouseDown={(e) => handleDragStart(task.id, e)}
                    onClick={() => {
                      const originalTask = tasks.find(t => t.id === task.id);
                      if (originalTask) onTaskClick?.(originalTask);
                    }}
                  />

                  {/* Task progress */}
                  {task.status === 'in_progress' && (
                    <rect
                      x={LABEL_WIDTH + pos.x}
                      y={y}
                      width={pos.width * 0.5}
                      height={TASK_BAR_HEIGHT}
                      rx={4}
                      fill="#000"
                      opacity={0.2}
                    />
                  )}

                  {/* Critical path indicator */}
                  {isCritical && (
                    <text
                      x={LABEL_WIDTH + pos.x + pos.width / 2}
                      y={y + TASK_BAR_HEIGHT / 2 + 4}
                      textAnchor="middle"
                      fontSize={10}
                      fill="white"
                      fontWeight="bold"
                    >
                      CRITICAL
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </Paper>
    </Box>
  );
};

export default GanttChart;
