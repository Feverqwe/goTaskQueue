import React, {FC, SyntheticEvent, useCallback, useRef} from 'react';
import {Box, IconButton, InputAdornment, Paper, TextField} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import {Task} from '../../types';
import {api} from '../../../tools/api';

interface TaskInfoProps {
  task: Task;
  onUpdate: () => void;
}

const TaskInfo: FC<TaskInfoProps> = ({task, onUpdate}) => {
  const {id, command, label} = task;
  const refCommand = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const initLabel = label || command;

  const handleSetLabel = useCallback(
    async (e: SyntheticEvent) => {
      e.preventDefault();
      const label = refLabel.current?.value || '';
      if (label === initLabel) return;
      await api.setTaskLabel({id, label});
      await onUpdate();
    },
    [id, initLabel, onUpdate],
  );

  const handleCommandFocus = useCallback(() => {
    refCommand.current?.select();
  }, []);

  return (
    <Box m={1} mt={0} component={Paper} display="flex">
      <Box display="flex" flexGrow={1} sx={{flexDirection: {xs: 'column', sm: 'row'}}}>
        <Box
          component="form"
          onSubmit={handleSetLabel}
          flexGrow={1}
          alignItems="center"
          m={1}
          mr={{xs: 1, sm: 0}}
        >
          <TextField
            size="small"
            variant="outlined"
            defaultValue={initLabel}
            label="Label"
            fullWidth
            inputProps={{ref: refLabel}}
            InputLabelProps={{
              shrink: true,
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" edge="end">
                    <SaveIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <TextField
          sx={{flexGrow: 3, m: 1}}
          size="small"
          variant="outlined"
          value={command}
          label="Command"
          multiline
          maxRows={3}
          InputProps={{readOnly: true}}
          inputProps={{ref: refCommand}}
          onFocus={handleCommandFocus}
          InputLabelProps={{
            shrink: true,
          }}
        />
      </Box>
    </Box>
  );
};

export default TaskInfo;
