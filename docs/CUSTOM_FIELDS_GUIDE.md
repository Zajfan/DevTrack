# Custom Fields Feature Guide

## Overview

Custom Fields allow you to add project-specific metadata to tasks. Each project can define its own set of custom fields with different types of inputs, enabling flexible task tracking tailored to your workflow.

## Feature Capabilities

### Field Types

DevTrack supports six different field types:

1. **Text** - Single-line text input
   - Use for: Short notes, identifiers, names
   - Example: Sprint Name, Feature ID, Git Branch

2. **Number** - Numeric input
   - Use for: Story points, estimated hours, version numbers
   - Example: Story Points, Estimated Hours, Sprint Number

3. **Date** - Date picker
   - Use for: Deadlines, start dates, milestones
   - Example: Sprint Start Date, Release Date, Deadline

4. **Checkbox** - Boolean yes/no value
   - Use for: Flags, toggles, binary states
   - Example: Requires Review, Breaking Change, Deployed

5. **Select** - Single choice dropdown
   - Use for: Categories, single-choice options
   - Example: Team (Frontend/Backend/DevOps), Environment (Dev/Staging/Prod)

6. **MultiSelect** - Multiple choice dropdown
   - Use for: Tags, multiple categories
   - Example: Affected Modules, Required Skills, Related Features

### Required Fields

Custom fields can be marked as "Required" to enforce data entry. When a field is required:

- Users should provide a value when creating or editing tasks
- The field will be visually indicated in the UI

## How to Use

### 1. Define Custom Fields for a Project

**From Project Detail View:**

1. Navigate to a project
2. Click the "Custom Fields" button in the header
3. In the Custom Field Manager dialog:
   - Click "Create New Field"
   - Enter field name (e.g., "Sprint Number")
   - Select field type (e.g., "Number")
   - For Select/MultiSelect types: Enter comma-separated options
   - Toggle "Required" if needed
   - Click "Create"

**Field Management:**

- **Edit**: Click "Edit" on any existing field to modify name, options, or required status
- **Delete**: Click "Delete" to remove a field (this will also delete all task values for that field)
- **View**: All fields are listed with type and required indicators

### 2. Use Custom Fields in Tasks

**Creating a Task:**

1. Click "Create Task" in the Tasks view
2. Select the project
3. Fill in standard fields (Title, Description, Priority, Due Date)
4. **Custom fields for the selected project will appear automatically**
5. Enter values for any custom fields
6. Click "Create"

**Editing a Task:**

1. Click on a task or use the "Edit" button
2. Edit dialog will show all custom fields with their current values
3. Modify values as needed
4. Click "Save" to update

**Field Behavior:**

- Empty values are allowed for non-required fields
- Text fields accept any text input
- Number fields only accept numeric values
- Date fields use a date picker
- Checkboxes toggle between checked/unchecked
- Select fields show dropdown with defined options
- MultiSelect fields show all options with chips for selected values

## Technical Implementation

### Database Schema

```sql
-- Field definitions
CREATE TABLE custom_fields (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL, -- Text, Number, Date, Checkbox, Select, MultiSelect
  options TEXT,              -- JSON array for Select/MultiSelect
  required INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Task values
CREATE TABLE task_custom_values (
  task_id INTEGER NOT NULL,
  custom_field_id INTEGER NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (task_id, custom_field_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
);
```

### API Methods

**Field Management:**

- `customField.create(data)` - Create new field definition
- `customField.findByProjectId(projectId)` - Get all fields for a project
- `customField.update(id, data)` - Update field definition
- `customField.delete(id)` - Delete field and all values

**Task Values:**

- `customField.setTaskValue(taskId, fieldId, value)` - Set or update task value
- `customField.getTaskValue(taskId, fieldId)` - Get single value
- `customField.getTaskValues(taskId)` - Get all values for a task
- `customField.deleteTaskValue(taskId, fieldId)` - Remove task value

### Value Storage

- All values stored as strings in `task_custom_values.value`
- MultiSelect values: Comma-separated string (e.g., "Frontend,Backend,API")
- Checkbox values: "true" or "false"
- Number values: String representation of number (e.g., "42")
- Date values: ISO date string (e.g., "2025-12-01")
- Select/MultiSelect options: Stored as JSON array in `custom_fields.options`

## Use Cases

### Agile/Scrum Teams

```
Fields:
- Sprint Number (Number, Required)
- Story Points (Number)
- Sprint Start Date (Date)
- Sprint End Date (Date)
- Acceptance Criteria Met (Checkbox)
- Team (Select: Frontend, Backend, DevOps, QA)
```

### Bug Tracking

```
Fields:
- Severity (Select: Critical, High, Medium, Low)
- Affected Version (Text)
- Steps to Reproduce (Text)
- Browser/Platform (MultiSelect: Chrome, Firefox, Safari, iOS, Android)
- Reproducible (Checkbox)
- Fixed In Version (Text)
```

### Feature Development

```
Fields:
- Feature Area (Select: UI, API, Database, Documentation)
- Related Features (MultiSelect)
- Breaking Change (Checkbox)
- API Version (Number)
- Target Release (Date)
```

### Personal Projects

```
Fields:
- Learning Goal (Text)
- Difficulty (Select: Easy, Medium, Hard)
- Technologies Used (MultiSelect: Python, TypeScript, React, Docker)
- Tutorial Link (Text)
- Completed Date (Date)
```

## Tips and Best Practices

1. **Plan Your Fields**: Think about what metadata is consistently needed across tasks before creating fields
2. **Use Consistent Naming**: Keep field names clear and consistent (e.g., "Sprint Number" not "Sprint #")
3. **Don't Over-customize**: Start with a few essential fields and add more as needed
4. **Select vs MultiSelect**: Use Select for mutually exclusive options, MultiSelect for combinations
5. **Required Fields**: Only mark fields as required if they're truly essential for every task
6. **Options Format**: For Select fields, enter options as comma-separated values: "Option1, Option2, Option3"
7. **Field Types Are Permanent**: You cannot change a field's type after creation, plan carefully

## Limitations

- **No Field Reordering**: Fields appear in creation order, cannot be manually reordered
- **No Field Validation**: Beyond type (number/date), no custom validation rules
- **No Default Values**: Cannot set default values for new tasks
- **No Conditional Fields**: All fields always visible, no hide/show based on other values
- **No Field Dependencies**: Cannot make field A required only when field B has value X
- **Type Immutable**: Field type cannot be changed after creation (delete and recreate instead)

## Future Enhancements (Planned)

- **Field Templates**: Predefined field sets for common workflows
- **Field Groups**: Organize fields into collapsible sections
- **Custom Validation**: Regex patterns for text fields, min/max for numbers
- **Calculated Fields**: Fields computed from other field values
- **Field History**: Track changes to field values over time
- **Export/Import**: Share field definitions between projects
- **Advanced Filters**: Filter tasks by custom field values in list views

## Troubleshooting

### Custom Fields Not Showing in Task Dialog

- Ensure the project has custom fields defined
- Check that you've selected a project in the create dialog
- Custom fields load when dialog opens, try closing and reopening

### Field Values Not Saving

- Check browser console for errors
- Ensure required fields have values
- Verify database file permissions

### Select Options Not Appearing

- Options must be comma-separated: "A, B, C"
- Ensure field type is "Select" or "MultiSelect"
- Try editing the field to verify options are saved

### Cannot Delete Field

- Check if field is in use by tasks
- Fields can be deleted even if tasks have values (CASCADE delete)
- Refresh the page if delete doesn't reflect

## Database Inspection

To verify custom field data:

```bash
sqlite3 ~/.config/DevTrack/devtrack.db

-- View all custom fields
SELECT * FROM custom_fields;

-- View field usage per project
SELECT p.name, COUNT(cf.id) as field_count
FROM projects p
LEFT JOIN custom_fields cf ON cf.project_id = p.id
GROUP BY p.id;

-- View task values for a specific field
SELECT t.title, tcv.value
FROM tasks t
JOIN task_custom_values tcv ON tcv.task_id = t.id
WHERE tcv.custom_field_id = 1;

-- View all custom data for a task
SELECT cf.name, cf.field_type, tcv.value
FROM custom_fields cf
JOIN task_custom_values tcv ON tcv.custom_field_id = cf.id
WHERE tcv.task_id = 1;
```

## Components Reference

### CustomFieldManager

- **Location**: `src/renderer/components/CustomFieldManager.tsx`
- **Props**: `{ open: boolean, onClose: () => void, projectId: number }`
- **Usage**: Manage field definitions for a project

### CustomFieldInput

- **Location**: `src/renderer/components/CustomFieldInput.tsx`
- **Props**: `{ field: CustomField, value: string, onChange: (value: string) => void }`
- **Usage**: Render appropriate input widget for field type

## Code Example: Creating a Custom Field Programmatically

```typescript
// Create a Sprint Number field
const field = await window.electronAPI.customField.create({
  projectId: 1,
  name: 'Sprint Number',
  fieldType: CustomFieldType.Number,
  required: true,
  options: null
});

// Create a Team selection field
const teamField = await window.electronAPI.customField.create({
  projectId: 1,
  name: 'Team',
  fieldType: CustomFieldType.Select,
  required: false,
  options: JSON.stringify(['Frontend', 'Backend', 'DevOps', 'QA'])
});

// Set task value
await window.electronAPI.customField.setTaskValue(taskId, field.id, '23');

// Get task value
const sprintNum = await window.electronAPI.customField.getTaskValue(taskId, field.id);
console.log('Sprint:', sprintNum); // "23"
```
