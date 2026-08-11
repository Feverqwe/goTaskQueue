import React, {FC} from 'react';
import {Box, IconButton, MenuItem, Paper, TextField, Typography} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {Field} from 'react-final-form';
import {TemplateVariableType} from '../../../../../components/types';
import {parseOptions, required, variableKey} from './formUtils';
import {EditorVariable} from './types';

interface VariableCardProps {
  duplicateKey: boolean;
  index: number;
  onRemove: () => void;
  variable: EditorVariable;
}

const VariableCard: FC<VariableCardProps> = ({duplicateKey, index, onRemove, variable}) => {
  const options = parseOptions(variable.optionsText);

  return (
    <Paper variant="outlined" sx={{p: 1.5}}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
        }}
      >
        <Typography variant="subtitle2">Variable {index + 1}</Typography>
        <IconButton size="small" onClick={onRemove} aria-label={`Delete variable ${index + 1}`}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))'},
          gap: 1.5,
        }}
      >
        <Field<string>
          name={`variables[${index}].value`}
          validate={(value) =>
            variableKey(value) || (duplicateKey ? 'Key must be unique' : undefined)
          }
        >
          {({input, meta}) => (
            <TextField
              {...input}
              size="small"
              label="Key"
              required
              error={meta.touched && Boolean(meta.error)}
              helperText={
                meta.touched && meta.error
                  ? meta.error
                  : input.value
                    ? `Environment: TASK_VAR_${input.value.toUpperCase()}`
                    : 'Lowercase identifier'
              }
              slotProps={{inputLabel: {shrink: true}}}
            />
          )}
        </Field>
        <Field<string> name={`variables[${index}].name`} validate={required}>
          {({input, meta}) => (
            <TextField
              {...input}
              size="small"
              label="Label"
              required
              error={meta.touched && Boolean(meta.error)}
              helperText={meta.touched ? meta.error : 'Shown when running'}
              slotProps={{inputLabel: {shrink: true}}}
            />
          )}
        </Field>
        <Field<TemplateVariableType> name={`variables[${index}].type`}>
          {({input}) => (
            <TextField
              {...input}
              select
              size="small"
              label="Type"
              slotProps={{inputLabel: {shrink: true}}}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="select">Select</MenuItem>
            </TextField>
          )}
        </Field>

        {variable.type === 'select' ? (
          <>
            <Field<string>
              name={`variables[${index}].optionsText`}
              validate={(value) =>
                parseOptions(value || '').length > 0 ? undefined : 'Add at least one option'
              }
            >
              {({input, meta}) => (
                <TextField
                  {...input}
                  size="small"
                  label="Options"
                  required
                  multiline
                  minRows={3}
                  error={meta.touched && Boolean(meta.error)}
                  helperText={meta.touched && meta.error ? meta.error : 'One option per line'}
                  slotProps={{inputLabel: {shrink: true}}}
                  sx={{gridColumn: {sm: 'span 2'}}}
                />
              )}
            </Field>
            <Field<string> name={`variables[${index}].defaultValue`}>
              {({input}) => (
                <TextField
                  {...input}
                  select
                  size="small"
                  label="Default value"
                  value={options.includes(input.value) ? input.value : ''}
                  helperText="The first option is used if unset"
                  slotProps={{inputLabel: {shrink: true}}}
                >
                  <MenuItem value="">First option</MenuItem>
                  {options.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Field>
          </>
        ) : (
          <Field<string> name={`variables[${index}].defaultValue`}>
            {({input}) => (
              <TextField
                {...input}
                size="small"
                label="Default value"
                slotProps={{inputLabel: {shrink: true}}}
                sx={{gridColumn: {sm: 'span 2'}}}
              />
            )}
          </Field>
        )}
      </Box>
    </Paper>
  );
};

export default VariableCard;
