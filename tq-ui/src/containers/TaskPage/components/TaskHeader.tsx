import React, {
  FC,
  SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {Box, CardActionArea, IconButton, Paper, Typography} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {useNavigate} from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TaskName from './TaskName';
import TaskStatusIcon from './TaskStatusIcon';
import {api} from '../../../tools/api';
import {AddTaskRequest, RawTemplate, Task, TaskState} from '../../../components/types';
import TemplateDialog from '../../../components/TemplateDialog/TemplateDialog';
import KillDialog from '../../../components/KillDialog/KillDialog';
import IconActionButton from '../../../components/IconActionButton/IconActionButton';
import {RootStoreCtx} from '../../../components/RootStore/RootStoreCtx';
import TaskDialog from '../../../components/TaskDialog/TaskDialog';

interface TaskInfoProps {
  task: Task;
  showInfo: boolean;
  onToggleInfo: () => void;
  onUpdate: () => void;
}

const TaskHeader: FC<TaskInfoProps> = ({task, showInfo, onToggleInfo, onUpdate}) => {
  const navigate = useNavigate();
  const {name} = useContext(RootStoreCtx);
  const {id, state, label, command, error} = task;
  const [restartDialogTemplate, setRestartDialogTemplate] = useState<null | RawTemplate>(null);
  const [showConfirm, setShowConfirm] = useState<{type: string} | undefined>();
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  useMemo(() => {
    document.title = `Task ${label || command} — ${name}`;
  }, [name, label, command]);

  const handleStart = useCallback(async () => {
    await api.taskRun({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStop = useCallback(() => {
    setShowConfirm({type: 'stop'});
  }, []);

  const handleStopConfirmSubmit = useCallback(
    async (signal: number) => {
      await api.taskSignal({id, signal});
      onUpdate();
    },
    [id, onUpdate],
  );

  const handleRestart = useCallback(() => {
    const {
      templatePlace,
      state: _a,
      error: _b,
      createdAt: _c,
      startedAt: _d,
      finishedAt: _e,
      links: _f,
      ...newTaskProps
    } = task;

    setRestartDialogTemplate({
      ...newTaskProps,
      place: templatePlace,
      name: 'New task',
      variables: [],
    });
  }, [task]);

  const handleTitleClick = useCallback(() => {
    setShowTaskDialog((v) => !v);
  }, []);

  const handleCloseTaskDialog = useCallback(() => {
    setShowTaskDialog(false);
  }, []);

  const handleExpandClick = useCallback(() => {
    onToggleInfo();
  }, [onToggleInfo]);

  const handleRestartTask = useCallback(
    async (runTask: AddTaskRequest) => {
      const {id} = await api.add(runTask);

      if (runTask.isRun) {
        navigate(`/task?id=${id}`);
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

  const handleConfirmClose = useCallback(() => {
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
                  <IconActionButton onSubmit={handleStart} title="Start">
                    <PlayArrowIcon />
                  </IconActionButton>
                )) || (
                  <IconButton onClick={handleRestart} title="Restart">
                    <RestartAltIcon />
                  </IconButton>
                )}
              <IconButton onClick={handleExpandClick} title="Expand">
                {showInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <Box display="flex" alignItems="center" mx={1}>
                <TaskStatusIcon task={task} />
              </Box>
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
      <TaskDialog
        open={showTaskDialog}
        onClose={handleCloseTaskDialog}
        onUpdate={onUpdate}
        task={task}
      />
    </>
  );
};

export default TaskHeader;
