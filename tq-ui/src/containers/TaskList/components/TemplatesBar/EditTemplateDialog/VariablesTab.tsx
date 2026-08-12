import React, {FC} from 'react';
import {Box, Button, Paper, Stack, Typography} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {EditorVariable} from './types';
import VariableCard from './VariableCard';

interface VariablesTabProps {
  hidden: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  variables: EditorVariable[];
}

const VariablesTab: FC<VariablesTabProps> = ({hidden, onAdd, onRemove, variables}) => (
  <Box component="section" role="tabpanel" hidden={hidden} aria-label="Template variables">
    <Box
      sx={{
        display: 'flex',
        flexDirection: {xs: 'column', sm: 'row'},
        justifyContent: 'space-between',
        alignItems: {xs: 'flex-start', sm: 'center'},
        gap: 1,
        mb: 1.5,
      }}
    >
      <Box>
        <Typography variant="caption" color="text.disabled">
          Key <code>url</code>: command{' '}
          <Box component="code" sx={{whiteSpace: 'nowrap', fontFamily: 'monospace'}}>
            TASK_VAR_URL
          </Box>
          {' · '}label/group{' '}
          <Box component="code" sx={{whiteSpace: 'nowrap', fontFamily: 'monospace'}}>
            {'{{ vars.url }}'}
          </Box>
        </Typography>
      </Box>
      <Button size="small" onClick={onAdd} startIcon={<AddIcon />} sx={{whiteSpace: 'nowrap'}}>
        Add variable
      </Button>
    </Box>

    {variables.length === 0 ? (
      <Paper variant="outlined" sx={{p: 3, textAlign: 'center'}}>
        <Typography color="text.secondary" sx={{mb: 1}}>
          This template has no variables yet.
        </Typography>
        <Button size="small" variant="outlined" onClick={onAdd}>
          Add first variable
        </Button>
      </Paper>
    ) : (
      <Stack spacing={1.5}>
        {variables.map((variable, index) => (
          <VariableCard
            key={variable.editorId}
            duplicateKey={variables.some(
              (other, otherIndex) => otherIndex !== index && other.value === variable.value,
            )}
            index={index}
            variable={variable}
            onRemove={() => onRemove(index)}
          />
        ))}
      </Stack>
    )}
  </Box>
);

export default VariablesTab;
