/**
 * Label model
 */
export interface Label {
  id: number;
  projectId: number;
  name: string;
  color: string;
  description: string | null;
  createdAt: string;
}

/**
 * Data for creating a new label
 */
export interface CreateLabelData {
  projectId: number;
  name: string;
  color: string;
  description?: string;
}

/**
 * Data for updating a label
 */
export interface UpdateLabelData {
  name?: string;
  color?: string;
  description?: string;
}
