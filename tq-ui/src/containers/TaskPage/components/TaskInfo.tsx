import React, {FC, SyntheticEvent, useCallback, useRef} from 'react';
import {Box, Button, Checkbox, InputAdornment, Paper, TextField} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import {Task} from '../../../components/types';
import {api} from '../../../tools/api';
import IconActionButton from '../../../components/IconActionButton/IconActionButton';

interface TaskInfoProps {
  task: Task;
  remapNewLine: boolean;
  onToggleRemapNewLine: () => void;
  onUpdate: () => void;
}

const TaskInfo: FC<TaskInfoProps> = ({task, remapNewLine, onToggleRemapNewLine, onUpdate}) => {
  const {id, command, label, isOnlyCombined} = task;
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

  return (
    <Box m={1} mt={0} component={Paper}>
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
                  <IconActionButton type="submit" edge="end" onSubmit={handleSetLabel}>
                    <SaveIcon />
                  </IconActionButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box display="flex" alignItems="center" sx={{flexWrap: {xs: 'wrap', sm: 'nowrap'}}}>
          {!isOnlyCombined && (
            <>
              <Button
                sx={{ml: 1}}
                variant="outlined"
                component="a"
                href={`/api/task/stdout?id=${id}`}
                target="_blank"
              >
                stdout.log
              </Button>
              <Button
                sx={{ml: 1}}
                variant="outlined"
                component="a"
                href={`/api/task/stderr?id=${id}`}
                target="_blank"
              >
                stderr.log
              </Button>
            </>
          )}
          <Button
            sx={{ml: 1}}
            variant="outlined"
            component="a"
            href={`/api/task/combined?id=${id}`}
            target="_blank"
          >
            combined.log
          </Button>
          <Box mx={1} display="flex" alignItems="center">
            <Checkbox checked={remapNewLine} onChange={onToggleRemapNewLine} /> Remap new line
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TaskInfo;
