/**
 * Time entry interface
 */
export interface TimeEntry {
  id: number;
  taskId: number;
  userId: number;
  description: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null; // Duration in seconds
  isBillable: boolean;
  hourlyRate: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data for creating a new time entry
 */
export interface CreateTimeEntryData {
  taskId: number;
  userId: number;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  isBillable?: boolean;
  hourlyRate?: number;
}

/**
 * Data for updating a time entry
 */
export interface UpdateTimeEntryData {
  description?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  isBillable?: boolean;
  hourlyRate?: number;
}

/**
 * Time entry with additional task and user details
 */
export interface TimeEntryWithDetails extends TimeEntry {
  taskTitle?: string;
  taskStatus?: string;
  userName?: string;
  projectId?: number;
  projectName?: string;
}

/**
 * Time tracking statistics
 */
export interface TimeTrackingStats {
  totalDuration: number; // Total seconds tracked
  billableDuration: number; // Total billable seconds
  nonBillableDuration: number; // Total non-billable seconds
  totalEarnings: number; // Total earnings from billable hours
  entryCount: number; // Number of time entries
  averageDuration: number; // Average entry duration in seconds
}
