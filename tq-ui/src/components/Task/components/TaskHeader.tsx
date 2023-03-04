import React, {FC, SyntheticEvent, useCallback, useEffect, useMemo, useState} from 'react';
import {Box, CardActionArea, Divider, IconButton, Paper, Typography} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {Check} from '@mui/icons-material';
import {useNavigate} from 'react-router-dom';
import CircleIcon from '@mui/icons-material/Circle';
import TaskName from './TaskName';
import TaskStatusIcon from './TaskStatusIcon';
import {api} from '../../../tools/api';
import {AddTaskReuest, Task, TaskState} from '../../types';
import DialogMenu from '../../DialogMenu/DialogMenu';
import DialogMenuItem from '../../DialogMenu/DialogMenuItem';
import TaskLinks from './TaskLinks';
import {TemplateButton} from '../../RootStore/RootStoreProvider';
import TemplateDialog from '../../TemplateDialog/TemplateDialog';
import KillDialog from '../../KillDialog/KillDialog';

interface TaskInfoProps {
  task: Task;
  remapNewLine: boolean;
  onToggleRemapNewLine: () => void;
  onToggleInfo: () => void;
  onUpdate: () => void;
}

const TaskHeader: FC<TaskInfoProps> = ({
  task,
  remapNewLine,
  onToggleRemapNewLine,
  onToggleInfo,
  onUpdate,
}) => {
  const navigate = useNavigate();
  const {id, state, label, command, error, isOnlyCombined} = task;
  const [restartDialogTemplate, setRestartDialogTemplate] = useState<null | TemplateButton>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{type: string} | undefined>();

  useMemo(() => {
    document.title = `Task ${label || command} — TaskQueue`;
  }, [label, command]);

  const handleStart = useCallback(async () => {
    await api.taskRun({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStop = useCallback(async () => {
    setShowConfirm({type: 'stop'});
  }, []);

  const handleStopConfirmSubmit = useCallback(
    async (signal: number) => {
      await api.taskSignal({id, signal});
      onUpdate();
    },
    [id, onUpdate],
  );

  const handleOpenMenu = useCallback(() => {
    setShowMenu(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleRestart = useCallback(async () => {
    const {label, group, command, isPty, isOnlyCombined} = task;
    setRestartDialogTemplate({
      name: 'New task',
      label,
      group,
      variables: [],
      command,
      isPty,
      isOnlyCombined,
    });
  }, [task]);

  const handleTitleClick = useCallback(() => {
    onToggleInfo();
  }, [onToggleInfo]);

  const handleRestartTask = useCallback(
    async (run: boolean, runTask: AddTaskReuest) => {
      try {
        const {id} = await api.add(runTask);
        if (run) {
          await api.taskRun({id});
        }

        if (run) {
          navigate(`/task?id=${id}`);
        }
      } catch (err) {
        console.error(err);
      }
    },
    [navigate],
  );

  const handleCloseRestartDlg = useCallback(() => {
    setRestartDialogTemplate(null);
  }, []);

  const handleBack = useCallback(
    (e: SyntheticEvent) => {
      if ('metaKey' in e && e.metaKey) return;
      e.preventDefault();
      navigate('/');
    },
    [navigate],
  );

  const handleConfirmClose = useCallback(async () => {
    setShowConfirm(undefined);
  }, []);

  useEffect(() => {
    let metaKey = false;
    const handler = (e: KeyboardEvent) => {
      const isDown = e.type === 'keydown';
      if (isDown && metaKey && e.key === 'Escape') {
        navigate('/');
      }
      if (e.key === 'Meta') {
        metaKey = isDown;
      }
    };
    document.body.addEventListener('keyup', handler);
    document.body.addEventListener('keydown', handler);
    return () => {
      document.body.removeEventListener('keyup', handler);
      document.body.removeEventListener('keydown', handler);
    };
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
            <Box display="flex" alignItems="center">
              {(state === TaskState.Started && (
                <IconButton onClick={handleStop} title="Stop">
                  <StopIcon />
                </IconButton>
              )) ||
                (state === TaskState.Idle && (
                  <IconButton onClick={handleStart} title="Start">
                    <PlayArrowIcon />
                  </IconButton>
                )) || (
                  <IconButton onClick={handleRestart} title="Restart">
                    <RestartAltIcon />
                  </IconButton>
                )}
              <IconButton onClick={handleOpenMenu} title="Menu">
                <TaskStatusIcon task={task} />
                {task.links.length > 0 && (
                  <CircleIcon
                    sx={{position: 'absolute', right: 2, top: 2, width: 10, height: 10}}
                    color="disabled"
                  />
                )}
              </IconButton>
              <DialogMenu open={showMenu} onClose={handleCloseMenu}>
                {task.links.length > 0 && (
                  <>
                    <TaskLinks task={task} onClick={handleCloseMenu} />
                    <Divider />
                  </>
                )}
                <DialogMenuItem onClick={onToggleRemapNewLine}>
                  Remap new line
                  {remapNewLine && (
                    <Box display="flex" alignItems="center" pl={1}>
                      <Check fontSize="small" />
                    </Box>
                  )}
                </DialogMenuItem>
                <Divider />
                {!isOnlyCombined && (
                  <>
                    <DialogMenuItem
                      component="a"
                      href={`/api/task/stdout?id=${id}`}
                      target="_blank"
                      onClick={handleCloseMenu}
                    >
                      stdout.log
                    </DialogMenuItem>
                    <DialogMenuItem
                      component="a"
                      href={`/api/task/stderr?id=${id}`}
                      target="_blank"
                      onClick={handleCloseMenu}
                    >
                      stderr.log
                    </DialogMenuItem>
                  </>
                )}
                <DialogMenuItem
                  component="a"
                  href={`/api/task/combined?id=${id}`}
                  target="_blank"
                  onClick={handleCloseMenu}
                >
                  combined.log
                </DialogMenuItem>
              </DialogMenu>
            </Box>
          </Box>
        </Paper>
      </Box>
      {restartDialogTemplate && (
        <TemplateDialog
          open={true}
          template={restartDialogTemplate}
          isNew={true}
          onClose={handleCloseRestartDlg}
          onSubmit={handleRestartTask}
        />
      )}
      {showConfirm && showConfirm.type === 'stop' && (
        <KillDialog
          task={task}
          open={true}
          onSubmit={handleStopConfirmSubmit}
          onClose={handleConfirmClose}
        />
      )}
    </>
  );
};

export default TaskHeader;
