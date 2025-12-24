/**
 * Attachment model
 */
export interface Attachment {
  id: number;
  taskId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

/**
 * Data for creating a new attachment
 */
export interface CreateAttachmentData {
  taskId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
}
