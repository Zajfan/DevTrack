# DevTrack Settings Guide

## Overview

DevTrack includes a comprehensive settings system that allows you to customize the application to match your preferences and workflow. Settings are persisted locally using `electron-store` and can be exported/imported for backup or sharing across installations.

## Accessing Settings

Navigate to **Settings** from the sidebar menu or press the keyboard shortcut defined in your settings (default: `F1` for help).

## Settings Categories

### 1. Theme Settings

Customize the visual appearance of DevTrack:

- **Theme Mode**: Choose between Light, Dark, or Custom themes
- **Primary Color**: Main accent color used throughout the application
- **Secondary Color**: Secondary accent color for highlights
- **Background Color**: Main background color (custom mode)
- **Text Color**: Main text color (custom mode)
- **Custom CSS**: Advanced users can inject custom CSS for complete control

**Reset Option**: "Reset Theme to Defaults" restores the default dark theme.

### 2. Branding Settings

Personalize DevTrack for your organization:

- **Application Name**: Change the displayed application name
- **Company Name**: Your company or organization name
- **Logo URL**: URL to your custom logo image
- **Support Email**: Contact email for support inquiries

**Use Case**: Perfect for teams who want to white-label DevTrack or add company branding.

**Reset Option**: "Reset Branding to Defaults" restores DevTrack branding.

### 3. Keyboard Shortcuts

Configure keyboard shortcuts for quick actions:

**Default Shortcuts**:
- `Ctrl+Shift+P` - Create new project
- `Ctrl+Shift+T` - Create new task
- `Ctrl+K` - Global search
- `Ctrl+S` - Save current item
- `Delete` - Delete selected item
- `Ctrl+B` - Toggle sidebar
- `Ctrl+Tab` - Next view
- `Ctrl+Shift+Tab` - Previous view
- `Ctrl+Enter` - Quick add task
- `E` - Edit selected task
- `C` - Mark task as complete
- `A` - Assign task
- `M` - Add comment
- `Ctrl+Shift+D` - Toggle dark mode
- `F1` - Show help

**Actions**:
- **Edit**: Click the pencil icon to modify a shortcut's keys or description
- **Add Custom**: Create custom shortcuts for your workflow
- **Delete**: Remove custom shortcuts (default shortcuts can be modified but not deleted)

**Reset Option**: "Reset to Defaults" restores all shortcuts to their original configuration.

### 4. Workspace Settings

Configure default behavior and preferences:

- **Default View**: Choose which view loads first (List, Board, Calendar, Table, or Gallery)
- **Default Grouping**: How tasks are grouped (Status, Priority, Assignee, or None)
- **Default Sorting**: How tasks are sorted (Manual, Due Date, Priority, or Created Date)
- **Auto-save Interval**: How often changes are auto-saved (5-300 seconds)
- **Show Completed Tasks**: Toggle visibility of completed tasks
- **Enable Notifications**: Turn on/off system notifications
- **Enable Sound**: Enable/disable sound effects
- **Auto-save**: Toggle automatic saving

**Reset Option**: "Reset Workspace to Defaults" restores default workspace preferences.

## Global Actions

### Export Settings

Export all your settings to a JSON file for backup or transfer:

1. Click **Export Settings** button
2. Choose a location to save the file
3. File will be named `devtrack-settings-YYYY-MM-DD.json`

**Use Cases**:
- Backup before major changes
- Share configuration across team
- Transfer settings to new machine

### Import Settings

Import previously exported settings:

1. Click **Import Settings** button
2. Select a valid DevTrack settings JSON file
3. Settings will be validated and applied immediately

**Warning**: Importing will overwrite all current settings. Export current settings first if you want to preserve them.

### Reset All Settings

Completely reset DevTrack to factory defaults:

1. Click **Reset All Settings** button
2. Confirm the action (this cannot be undone)
3. All settings across all categories will be reset

**Warning**: This action is irreversible. Export your settings first if you want to keep them.

## Settings Persistence

- Settings are automatically saved when you make changes
- Settings are stored in your user data directory:
  - **Linux**: `~/.config/DevTrack/app-settings.json`
  - **macOS**: `~/Library/Application Support/DevTrack/app-settings.json`
  - **Windows**: `%APPDATA%\DevTrack\app-settings.json`
- Settings persist across application restarts
- Last updated timestamp is tracked automatically

## Settings Info Footer

At the bottom of the Settings page, you'll see:
- **Settings Version**: Current settings schema version
- **Last Updated**: Timestamp of the last settings change

## API Access (Advanced)

The settings system is also accessible via the REST API when enabled:

```bash
# Get all settings
curl http://localhost:3000/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update specific setting
curl -X PUT http://localhost:3000/api/settings/theme \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "dark", "primaryColor": "#2563eb"}'
```

See the API documentation at `/api-docs` when running with `ENABLE_API=true` for complete endpoint details.

## Troubleshooting

### Settings not saving
- Check file permissions in your user data directory
- Try exporting settings to verify write access
- Check the developer console for errors (View > Toggle Developer Tools)

### Settings reset unexpectedly
- Check if multiple instances of DevTrack are running
- Verify settings file exists in user data directory
- Export settings immediately after configuring to have a backup

### Import fails
- Ensure JSON file is valid DevTrack settings export
- Check that the file hasn't been manually edited incorrectly
- Try exporting current settings to see the expected format

### Keyboard shortcuts not working
- Ensure no conflicts with system shortcuts
- Try different key combinations
- Check that shortcuts are properly saved in the Keyboard Shortcuts tab

## Best Practices

1. **Export Regularly**: Export your settings after making significant customizations
2. **Test Before Reset**: Try resetting individual sections before resetting all settings
3. **Document Custom Shortcuts**: Keep notes on custom shortcuts for team onboarding
4. **Backup Settings File**: Manually backup the settings file from user data directory
5. **Version Control**: For teams, keep settings exports in version control for consistency

## Future Enhancements

The settings system is designed to be extensible. Future versions may include:
- Settings profiles (work, personal, team)
- Cloud sync for settings
- Per-project settings overrides
- Advanced theme editor with live preview
- Import/export individual setting categories
- Settings search and recommendations
