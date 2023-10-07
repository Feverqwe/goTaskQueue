import React, {FC, SyntheticEvent, useCallback, useRef, useState} from 'react';
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {Task} from '../types';
import {api} from '../../tools/api';
import IconActionButton from '../IconActionButton/IconActionButton';
import {getTaskName} from '../../containers/TaskPage/utils';
import KeyValue from './components/KeyValue';

interface TaskDialogViewProps {
  task: Task;
  onUpdate: () => Promise<void>;
  onClose: () => void;
}

const TaskDialogView: FC<TaskDialogViewProps> = ({task, onUpdate, onClose}) => {
  const {id, command, label, isOnlyCombined} = task;
  const refCommand = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const initLabel = label || command;
  const [isEditTitle, setEditTitle] = useState(false);
  const [isExtended, setExtended] = useState(false);

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

  const handleAdvancedClick = useCallback(() => {
    setExtended((v) => !v);
  }, []);

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
        )}
      </DialogTitle>
      <DialogContent>
        <Button
          sx={{my: 1}}
          size="small"
          onClick={handleAdvancedClick}
          startIcon={isExtended ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        >
          Advanced
        </Button>
        {isExtended ? (
          <>
            <Box display="flex" flexDirection="column" gap={1} mb={1}>
              <KeyValue name="Created At" value={task.createdAt} type="datetime" />
              <KeyValue name="Started At" value={task.startedAt} type="datetime" />
              <KeyValue name="Finished At" value={task.finishedAt} type="datetime" />
            </Box>
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
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
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
        <Button sx={{ml: 1}} variant="outlined" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </>
  );
};

export default TaskDialogView;
