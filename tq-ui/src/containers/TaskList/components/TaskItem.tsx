import {Box, Card, CardActionArea, IconButton} from '@mui/material';
import React, {FC, SyntheticEvent, useCallback, useMemo, useState} from 'react';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ClearIcon from '@mui/icons-material/Clear';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {useNavigate} from 'react-router-dom';
import CircleIcon from '@mui/icons-material/Circle';
import TaskStatusIcon from '../../TaskPage/components/TaskStatusIcon';
import {api} from '../../../tools/api';
import {Task, TaskState} from '../../../components/types';
import TaskName from '../../TaskPage/components/TaskName';
import TaskLinks from '../../TaskPage/components/TaskLinks';
import DialogMenu from '../../../components/DialogMenu/DialogMenu';
import LinkIcon from '../../TaskPage/components/LinkIcon';
import KillDialog from '../../../components/KillDialog/KillDialog';
import IconActionButton from '../../../components/IconActionButton/IconActionButton';

interface TaskItemProps {
  task: Task;
  onUpdate: () => void;
}

const TaskItem: FC<TaskItemProps> = ({task, onUpdate}) => {
  const {id, state} = task;
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{type: string} | undefined>();

  const handleDelete = useCallback(async () => {
    await api.delete({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStart = useCallback(async () => {
    await api.taskRun({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStop = useCallback(async () => {
    setShowConfirm({type: 'stop'});
  }, []);

  const handleOpen = useCallback(
    (e: SyntheticEvent) => {
      if ('metaKey' in e && e.metaKey) return;
      e.preventDefault();
      navigate(`task?id=${id}`);
    },
    [navigate, id],
  );

  const handleOpenMenu = useCallback(() => {
    setOpenMenu(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setOpenMenu(false);
  }, []);

  const handleStopConfirmSubmit = useCallback(
    async (signal: number) => {
      await api.taskSignal({id, signal});
      onUpdate();
    },
    [id, onUpdate],
  );

  const handleConfirmClose = useCallback(() => {
    setShowConfirm(undefined);
  }, []);

  const extraButtons = useMemo(() => {
    const result = [];
    if ([TaskState.Started, TaskState.Idle].includes(state)) {
      result.push(
        <Box key={result.length} display="flex" alignItems="center" pl={result.length ? 1 : 0}>
          {(state === TaskState.Started && (
            <IconActionButton onSubmit={handleStop} title="Stop">
              <StopIcon />
            </IconActionButton>
          )) ||
            (state === TaskState.Idle && (
              <IconActionButton onSubmit={handleStart} title="Start">
                <PlayArrowIcon />
              </IconActionButton>
            ))}
        </Box>,
      );
    }
    if (task.links.length) {
      const {links, state} = task;
      const {type, title, url} = links[0];
      result.push(
        <Box key={result.length} display="flex" alignItems="center">
          {links.length === 1 && state === TaskState.Finished ? (
            <IconButton href={url} target="_blank" title={title}>
              <LinkIcon color="success" type={type} />
            </IconButton>
          ) : (
            <IconButton onClick={handleOpenMenu} title="Menu">
              <TaskStatusIcon task={task} />
              <CircleIcon
                sx={{position: 'absolute', right: 2, top: 2, width: 10, height: 10}}
                color="disabled"
              />
            </IconButton>
          )}
        </Box>,
      );
    } else {
      result.push(
        <Box key={result.length} display="flex" alignItems="center" px={1}>
          <TaskStatusIcon task={task} />
        </Box>,
      );
    }
    result.push(
      <Box key={result.length} display="flex" alignItems="center">
        <KeyboardArrowRightIcon />
      </Box>,
    );
    return result;
  }, [handleStart, handleStop, handleOpenMenu, state, task]);

  return (
    <Box px={1} pb={1}>
      <Card>
        <Box display="flex" flexDirection="row" alignItems="stretch">
          <Box display="flex" alignItems="center">
            <IconActionButton
              disabled={state === TaskState.Started}
              onSubmit={handleDelete}
              title="Delete"
            >
              <ClearIcon />
            </IconActionButton>
          </Box>
          <Box flexGrow={1}>
            <CardActionArea
              href={`task?id=${id}`}
              onClick={handleOpen}
              sx={{height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center'}}
            >
              <Box px={1} width="100%" sx={{wordBreak: 'break-all'}}>
                <TaskName task={task} />
              </Box>
            </CardActionArea>
          </Box>
          {extraButtons}
        </Box>
      </Card>
      {openMenu && (
        <DialogMenu open={openMenu} onClose={handleCloseMenu}>
          <TaskLinks task={task} onClick={handleCloseMenu} />
        </DialogMenu>
      )}
      {showConfirm && showConfirm.type === 'stop' && (
        <KillDialog
          task={task}
          open={true}
          onSubmit={handleStopConfirmSubmit}
          onClose={handleConfirmClose}
        />
      )}
    </Box>
  );
};

export default TaskItem;