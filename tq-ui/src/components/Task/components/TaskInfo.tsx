import React, {FC, SyntheticEvent, useCallback, useRef, useState} from 'react';
import {Box, IconButton, InputAdornment, Paper, TextField} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import {Task} from '../../types';
import {api} from '../../../tools/api';

interface TaskInfoProps {
  task: Task;
  onUpdate: () => void;
}

const TaskInfo:FC<TaskInfoProps> = ({task, onUpdate}) => {
  const {id, command, label} = task;
  const refCommand = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const initLabel = label || command;

  const handleSetLabel = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    const label = refLabel.current?.value || '';
    if (label === initLabel) return;
    await api.setTaskLabel({id, label});
    await onUpdate();
  }, [id, initLabel, onUpdate]);

  const handleCommandFocus = useCallback(() => {
    refCommand.current?.select();
  }, []);

  return (
    <Box p={1} pt={0}>
      <Paper>
        <Box component="form" onSubmit={handleSetLabel} display="flex" alignItems="center" p={1}>
          <TextField
            variant="standard"
            defaultValue={initLabel}
            label="Label"
            fullWidth
            inputProps={{ref: refLabel}}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit">
                    <SaveIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box p={1}>
          <TextField
            variant="standard"
            value={command}
            label="Command"
            multiline
            fullWidth
            InputProps={{readOnly: true}}
            inputProps={{ref: refCommand}}
            onFocus={handleCommandFocus}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default TaskInfo;
