import {
  TextField,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
} from '@mui/material';
import { CustomField, CustomFieldType } from '../types';

interface CustomFieldInputProps {
  field: CustomField;
  value: string;
  onChange: (value: string) => void;
}

export default function CustomFieldInput({ field, value, onChange }: CustomFieldInputProps) {
  const parseOptions = (options: string | null): string[] => {
    if (!options) return [];
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const renderField = () => {
    switch (field.fieldType) {
      case CustomFieldType.Text:
        return (
          <TextField
            label={field.name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            fullWidth
            required={field.required}
            size="small"
          />
        );

      case CustomFieldType.Number:
        return (
          <TextField
            label={field.name}
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            fullWidth
            required={field.required}
            size="small"
          />
        );

      case CustomFieldType.Date:
        return (
          <TextField
            label={field.name}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            fullWidth
            required={field.required}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        );

      case CustomFieldType.Checkbox:
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={value === 'true'}
                onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
              />
            }
            label={field.name}
          />
        );

      case CustomFieldType.Select:
        const options = parseOptions(field.options);
        return (
          <FormControl fullWidth size="small" required={field.required}>
            <InputLabel>{field.name}</InputLabel>
            <Select
              value={value}
              label={field.name}
              onChange={(e) => onChange(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {options.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case CustomFieldType.MultiSelect:
        const multiOptions = parseOptions(field.options);
        const selectedValues = value ? value.split(',').map(v => v.trim()) : [];
        
        return (
          <FormControl fullWidth size="small" required={field.required}>
            <InputLabel>{field.name}</InputLabel>
            <Select
              multiple
              value={selectedValues}
              label={field.name}
              onChange={(e) => {
                const selected = typeof e.target.value === 'string' 
                  ? e.target.value.split(',') 
                  : e.target.value;
                onChange(selected.join(', '));
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {multiOptions.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      default:
        return null;
    }
  };

  return <Box sx={{ mb: 2 }}>{renderField()}</Box>;
}
