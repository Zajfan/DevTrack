/**
 * Custom field type enum
 */
export enum CustomFieldType {
  Text = 'text',
  Number = 'number',
  Date = 'date',
  Checkbox = 'checkbox',
  Select = 'select',
  MultiSelect = 'multi_select'
}

/**
 * Custom field model
 */
export interface CustomField {
  id: number;
  projectId: number;
  name: string;
  fieldType: CustomFieldType;
  options: string | null; // JSON string for select/multi-select options
  required: boolean;
  createdAt: string;
}

/**
 * Data for creating a new custom field
 */
export interface CreateCustomFieldData {
  projectId: number;
  name: string;
  fieldType: CustomFieldType;
  options?: string;
  required?: boolean;
}

/**
 * Data for updating a custom field
 */
export interface UpdateCustomFieldData {
  name?: string;
  options?: string;
  required?: boolean;
}

/**
 * Task custom field value
 */
export interface TaskCustomValue {
  taskId: number;
  customFieldId: number;
  value: string;
}
