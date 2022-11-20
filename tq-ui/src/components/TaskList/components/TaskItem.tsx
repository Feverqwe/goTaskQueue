import {Box, Card, CardActionArea, IconButton} from '@mui/material';
import React, {FC, SyntheticEvent, useCallback, useMemo} from 'react';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ClearIcon from '@mui/icons-material/Clear';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {useNavigate} from 'react-router-dom';
import TaskStatusIcon from '../../Task/components/TaskStatus';
import {api} from '../../../tools/api';
import {Task, TaskState} from '../../types';
import TaskName from '../../Task/components/TaskName';
import TaskLinks from '../../Task/components/TaskLinks';

interface TaskItemProps {
  task: Task,
  onUpdate: () => void;
}

const TaskItem: FC<TaskItemProps> = ({task, onUpdate}) => {
  const {id, state} = task;
  const navigate = useNavigate();

  const handleDelete = useCallback(async () => {
    await api.delete({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStart = useCallback(async () => {
    await api.taskRun({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStop = useCallback(async () => {
    await api.taskKill({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleOpen = useCallback((e: SyntheticEvent) => {
    e.preventDefault();
    navigate(`task?id=${id}`);
  }, [navigate, id]);

  const extraButtons = useMemo(() => {
    const result = [];
    if (task.links.length > 0) {
      result.push(
        <Box key={result.length} display="flex" pl={result.length ? 1 : 0}>
          <TaskLinks task={task} />
        </Box>,
      );
    }
    if ([TaskState.Started, TaskState.Idle].includes(state)) {
      result.push(
        <Box key={result.length} display="flex" pl={result.length ? 1 : 0}>
          {state === TaskState.Started && (
            <IconButton onClick={handleStop} title="Stop">
              <StopIcon />
            </IconButton>
          ) || state === TaskState.Idle && (
            <IconButton onClick={handleStart} title="Start">
              <PlayArrowIcon />
            </IconButton>
          )}
        </Box>,
      );
    }
    result.push(
      <Box key={result.length} display="flex" pl={result.length ? 1 : 0} alignItems="center">
        <TaskStatusIcon task={task} />
      </Box>,
    );
    result.push(
      <Box key={result.length} display="flex" pl={1} alignItems="center">
        <KeyboardArrowRightIcon />
      </Box>,
    );
    return result;
  }, [handleStart, handleStop, state, task]);

  return (
    <Box px={1} pb={1}>
      <Card>
        <Box display="flex" flexDirection="row" alignItems="stretch">
          <Box display="flex">
            <IconButton disabled={state === TaskState.Started} onClick={handleDelete} title="Delete">
              <ClearIcon />
            </IconButton>
          </Box>
          <Box flexGrow={1}>
            <CardActionArea href={`task?id=${id}`} onClick={handleOpen} sx={{height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
              <Box pl={1} width="100%" sx={{wordBreak: 'break-all'}}>
                <TaskName task={task} />
              </Box>
            </CardActionArea>
          </Box>
          {extraButtons}
        </Box>
      </Card>
    </Box>
  );
};

export default TaskItem;
