import React, {FC, SyntheticEvent, useCallback, useRef, useState} from 'react';
import {
  Box,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import {Task} from '../types';
import {api} from '../../tools/api';
import IconActionButton from '../IconActionButton/IconActionButton';
import {getTaskName} from '../../containers/TaskPage/utils';

interface TaskDialogViewProps {
  task: Task;
  onUpdate: () => Promise<void>;
}

const TaskDialogView: FC<TaskDialogViewProps> = ({task, onUpdate}) => {
  const {id, command, label} = task;
  const refCommand = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const initLabel = label || command;
  const [isEditTitle, setEditTitle] = useState(false);

  const handleSetLabel = useCallback(
    async (e: SyntheticEvent) => {
      e.preventDefault();
      const label = refLabel.current?.value || '';
      if (label !== initLabel) {
        await api.setTaskLabel({
          id,
          label,
        });
        await onUpdate();
      }
      setEditTitle(false);
    },
    [id, initLabel, onUpdate],
  );

  const handleCommandFocus = useCallback(() => {
    refCommand.current?.select();
  }, []);

  const handleEdit = useCallback(() => setEditTitle(true), []);

  return (
    <>
      <DialogTitle>
        {!isEditTitle && (
          <Box display="flex" alignItems="center">
            <Box sx={{whiteSpace: 'nowrap', overflow: 'hidden'}}>{getTaskName(task)}</Box>
            <IconButton onClick={handleEdit} sx={{ml: 1}}>
              <EditIcon />
            </IconButton>
          </Box>
        )}
        {isEditTitle && (
          <Box component="form" onSubmit={handleSetLabel}>
            <TextField
              size="small"
              variant="outlined"
              defaultValue={initLabel}
              label="Label"
              fullWidth
              inputProps={{ref: refLabel}}
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
        )}
      </DialogTitle>
      <DialogContent>
        <TextField
          sx={{my: 1}}
          size="small"
          variant="outlined"
          value={command}
          label="Command"
          fullWidth
          multiline
          maxRows={3}
          InputProps={{readOnly: true}}
          inputProps={{ref: refCommand}}
          onFocus={handleCommandFocus}
          InputLabelProps={{
            shrink: true,
          }}
        />
      </DialogContent>
    </>
  );
};

export default TaskDialogView;
