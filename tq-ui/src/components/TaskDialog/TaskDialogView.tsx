import React, {FC, SyntheticEvent, useCallback, useRef, useState} from 'react';
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  SxProps,
  TextField,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import {Theme as SystemTheme} from '@mui/system/createTheme/createTheme';
import {Task} from '../types';
import {api} from '../../tools/api';
import IconActionButton from '../IconActionButton/IconActionButton';
import {getTaskName} from '../../containers/TaskPage/utils';
import KeyValue from './components/KeyValue';
import {CommandFieldRef} from '../CommandField/CommandField';
import CommandFieldAsync from '../CommandField/CommandFieldAsync';

interface TaskDialogViewProps {
  task: Task;
  onUpdate: () => Promise<void>;
  onClose: () => void;
}

const KeyValueSx: SxProps<SystemTheme> = {flexGrow: {sm: '1'}, width: {sm: '45%'}};

const TaskDialogView: FC<TaskDialogViewProps> = ({task, onUpdate, onClose}) => {
  const {id, command, label, isOnlyCombined} = task;
  const refCommand = useRef<CommandFieldRef>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const initLabel = label || command;
  const [isEditTitle, setEditTitle] = useState(false);
  /* const [isExtended, setExtended] = useState(false); */

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

  const handleEdit = useCallback(() => setEditTitle(true), []);

  /* const handleAdvancedClick = useCallback(() => {
    setExtended((v) => !v);
  }, []); */

  return (
    <>
      <DialogTitle>
        {!isEditTitle && (
          <Box display="flex" alignItems="center" fontSize="medium">
            <Box
              sx={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}
              flexGrow={1}
            >
              {getTaskName(task)}
            </Box>
            <IconButton size="small" onClick={handleEdit} sx={{ml: 1}}>
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
              slotProps={{
                htmlInput: {ref: refLabel},
                inputLabel: {shrink: true},
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconActionButton type="submit" edge="end" onSubmit={handleSetLabel}>
                        <SaveIcon />
                      </IconActionButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        )}
      </DialogTitle>
      <DialogContent>
        <Box
          display="flex"
          gap={1}
          mb={1}
          sx={{flexDirection: {xs: 'column', sm: 'row'}, flexWrap: {xs: 'nowrap', sm: 'wrap'}}}
        >
          <KeyValue name="Created at" value={task.createdAt} type="datetime" sx={KeyValueSx} />
          <KeyValue name="Started at" value={task.startedAt} type="datetime" sx={KeyValueSx} />
          <KeyValue name="Finished at" value={task.finishedAt} type="datetime" sx={KeyValueSx} />
          <KeyValue name="Expires at" value={task.expiresAt} type="datetime" sx={KeyValueSx} />
        </Box>
        <CommandFieldAsync
          ref={refCommand as React.RefObject<CommandFieldRef>}
          defaultValue={command}
          readOnly
        />
        {/* <Button
          size="small"
          onClick={handleAdvancedClick}
          startIcon={isExtended ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        >
          Advanced
        </Button>
        {isExtended ? (
          <>
          </>
        ) : null} */}
      </DialogContent>
      <DialogActions>
        <Button sx={{ml: 1}} variant="outlined" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </>
  );
};

export default TaskDialogView;
