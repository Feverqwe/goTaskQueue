import React, {FC, useCallback, useMemo, useState} from 'react';
import {Box, CardActionArea, Divider, IconButton, Menu, MenuItem, Paper, Typography} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {Check} from '@mui/icons-material';
import TaskName from './TaskName';
import TaskStatusIcon from './TaskStatus';
import {api} from '../../../tools/api';
import {Task, TaskState} from '../../types';
import ConfirmDialog from './ConfirmDialog';

interface TaskInfoProps {
  task: Task;
  remapNewLine: boolean;
  onToggleFixNewLine: () => void;
  onToggleInfo: () => void;
  onUpdate: () => void;
}

const TaskHeader: FC<TaskInfoProps> = ({task, remapNewLine, onToggleFixNewLine, onToggleInfo, onUpdate}) => {
  const {id, state, label, command, error} = task;
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  useMemo(() => {
    document.title = `Task ${label || command} — TaskQueue`;
  }, [label, command]);

  const handleStart = useCallback(async () => {
    await api.taskRun({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStop = useCallback(async () => {
    await api.taskKill({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleOpenMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSigint = useCallback(() => {
    api.taskSignal({id, signal: 'SIGINT'});
    handleCloseMenu();
  }, [id, handleCloseMenu]);

  const handleRestart = useCallback(async () => {
    setConfirmDialog(true);
  }, []);

  const handleTitleClick = useCallback(() => {
    onToggleInfo();
  }, [onToggleInfo]);

  const handleConfirmRestart = useCallback(async () => {
    const task = await api.clone({id});
    await api.taskRun({id: task.id});
    location.href = `task?id=${task.id}`;
  }, [id]);

  const handleCloseConfirm = useCallback(() => {
    setConfirmDialog(false);
  }, []);

  return (
    <>
      <Box p={1}>
        <Paper component="form">
          <Box display="flex" flexDirection="row" alignItems="stretch">
            <Box display="flex" alignItems="center">
              <IconButton href="/">
                <ChevronLeftIcon />
              </IconButton>
            </Box>
            <Box flexGrow={1}>
              <CardActionArea onClick={handleTitleClick} sx={{height: '100%'}}>
                <Box display="flex" px={1} flexDirection="row" sx={{wordBreak: 'break-all'}}>
                  <TaskName task={task} />
                </Box>
                {error && (
                  <Box px={1}>
                    <Typography variant="subtitle2" color="#ff8a80">
                      {error}
                    </Typography>
                  </Box>
                )}
              </CardActionArea>
            </Box>
            <Box display="flex" alignItems="center">
              {state === TaskState.Started && (
                <IconButton onClick={handleStop}>
                  <StopIcon />
                </IconButton>
              ) || state === TaskState.Idle && (
                <IconButton onClick={handleStart}>
                  <PlayArrowIcon />
                </IconButton>
              ) || (
                <IconButton onClick={handleRestart}>
                  <RestartAltIcon />
                </IconButton>
              )}
              <IconButton onClick={handleOpenMenu}>
                <TaskStatusIcon task={task} />
              </IconButton>
              <Menu open={Boolean(anchorEl)} onClose={handleCloseMenu} anchorEl={anchorEl}>
                <MenuItem onClick={onToggleFixNewLine}>
                  Remap new line
                  {remapNewLine && (
                    <Box display="flex" alignItems="center" pl={1}>
                      <Check fontSize="small" />
                    </Box>
                  )}
                </MenuItem>
                {state === TaskState.Started && (
                  <MenuItem onClick={handleSigint}>SIGINT</MenuItem>
                )}
                <Divider />
                <MenuItem component="a" href={`/api/task/stdout?id=${id}`} target="_blank">stdout.log</MenuItem>
                <MenuItem component="a" href={`/api/task/stderr?id=${id}`} target="_blank">stderr.log</MenuItem>
                <MenuItem component="a" href={`/api/task/combined?id=${id}`} target="_blank">combined.log</MenuItem>
              </Menu>
            </Box>
          </Box>
        </Paper>
      </Box>
      {confirmDialog && (
        <ConfirmDialog
          open={true}
          title="Restart task?"
          message={<TaskName task={task} />}
          onClose={handleCloseConfirm}
          onSubmit={handleConfirmRestart}
        />
      )}
    </>
  );
};

export default TaskHeader;
