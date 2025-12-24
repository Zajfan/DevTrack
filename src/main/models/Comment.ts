/**
 * Comment model
 */
export interface Comment {
  id: number;
  taskId: number;
  author: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data for creating a new comment
 */
export interface CreateCommentData {
  taskId: number;
  author: string;
  content: string;
}

/**
 * Data for updating a comment
 */
export interface UpdateCommentData {
  content: string;
}
