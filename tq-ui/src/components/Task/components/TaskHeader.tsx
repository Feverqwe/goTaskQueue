import React, {FC, SyntheticEvent, useCallback, useMemo, useState} from 'react';
import {Box, CardActionArea, Divider, IconButton, Paper, Typography} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {Check} from '@mui/icons-material';
import {useNavigate} from 'react-router-dom';
import TaskName from './TaskName';
import TaskStatusIcon from './TaskStatus';
import {api} from '../../../tools/api';
import {Task, TaskState} from '../../types';
import ConfirmDialog from './ConfirmDialog';
import DialogMenu from '../../DialogMenu/DialogMenu';
import DialogMenuItem from '../../DialogMenu/DialogMenuItem';
import TaskLinks from './TaskLinks';
import {ScreenSize} from '../types';

interface TaskInfoProps {
  task: Task;
  remapNewLine: boolean;
  screenSize: ScreenSize | null;
  onToggleRemapNewLine: () => void;
  onToggleInfo: () => void;
  onUpdate: () => void;
  onSetScreenSize: (size: ScreenSize | null) => void;
}

const TaskHeader: FC<TaskInfoProps> = ({task, remapNewLine, screenSize, onToggleRemapNewLine, onSetScreenSize, onToggleInfo, onUpdate}) => {
  const navigate = useNavigate();
  const {id, state, label, command, error, isPty} = task;
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [showMenu, setShowMenu] = React.useState(false);

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

  const handleOpenMenu = useCallback(() => {
    setShowMenu(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
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
    navigate(`/task?id=${task.id}`);
  }, [id, navigate]);

  const handleCloseConfirm = useCallback(() => {
    setConfirmDialog(false);
  }, []);

  const handleBack = useCallback((e: SyntheticEvent) => {
    e.preventDefault();
    navigate('/');
  }, [navigate]);

  return (
    <>
      <Box p={1}>
        <Paper component="form">
          <Box display="flex" flexDirection="row" alignItems="stretch">
            <Box display="flex" alignItems="center">
              <IconButton href="/" onClick={handleBack} title="Back">
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
            {task.links.length > 0 && (
              <Box display="flex" alignItems="center">
                <TaskLinks task={task} />
              </Box>
            )}
            <Box display="flex" alignItems="center">
              {state === TaskState.Started && (
                <IconButton onClick={handleStop} title="Stop">
                  <StopIcon />
                </IconButton>
              ) || state === TaskState.Idle && (
                <IconButton onClick={handleStart} title="Start">
                  <PlayArrowIcon />
                </IconButton>
              ) || (
                <IconButton onClick={handleRestart} title="Restart">
                  <RestartAltIcon />
                </IconButton>
              )}
              <IconButton onClick={handleOpenMenu} title="Menu">
                <TaskStatusIcon task={task} />
              </IconButton>
              <DialogMenu open={showMenu} onClose={handleCloseMenu}>
                <DialogMenuItem onClick={onToggleRemapNewLine}>
                  Remap new line
                  {remapNewLine && (
                    <Box display="flex" alignItems="center" pl={1}>
                      <Check fontSize="small" />
                    </Box>
                  )}
                </DialogMenuItem>
                {state === TaskState.Started && (
                  <DialogMenuItem onClick={handleSigint}>SIGINT</DialogMenuItem>
                )}
                <Divider />
                {isPty && (
                  <>
                    {[null, {width: 640, height: 480}, {width: 1280, height: 720}].map((sizes, index) => {
                      const isCurrent = screenSize?.height === sizes?.height;
                      return (
                        <DialogMenuItem key={index} onClick={onSetScreenSize.bind(null, sizes)}>
                          Size: {!sizes ? 'auto' : `${sizes.width}x${sizes.height}`}
                          {isCurrent && (
                            <Box display="flex" alignItems="center" pl={1}>
                              <Check fontSize="small" />
                            </Box>
                          )}
                        </DialogMenuItem>
                      );
                    })}
                    <Divider />
                  </>
                )}
                <DialogMenuItem component="a" href={`/api/task/stdout?id=${id}`} target="_blank">stdout.log</DialogMenuItem>
                <DialogMenuItem component="a" href={`/api/task/stderr?id=${id}`} target="_blank">stderr.log</DialogMenuItem>
                <DialogMenuItem component="a" href={`/api/task/combined?id=${id}`} target="_blank">combined.log</DialogMenuItem>
              </DialogMenu>
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
