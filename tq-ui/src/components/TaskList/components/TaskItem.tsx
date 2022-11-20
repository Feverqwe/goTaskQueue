import {Box, Card, CardActionArea, IconButton} from '@mui/material';
import React, {FC, SyntheticEvent, useCallback} from 'react';
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

  const handleDelete = useCallback(async (e: SyntheticEvent) => {
    await api.delete({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStart = useCallback(async (e: SyntheticEvent) => {
    await api.taskRun({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStop = useCallback(async (e: SyntheticEvent) => {
    await api.taskKill({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleOpen = useCallback((e: SyntheticEvent) => {
    e.preventDefault();
    navigate(`task?id=${id}`);
  }, [navigate, id]);

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
          {task.links.length > 0 && (
          <Box display="flex">
            <TaskLinks task={task} />
          </Box>
          )}
          <Box display="flex" pl={task.links.length ? 1 : 0}>
            {state === TaskState.Started && (
            <IconButton onClick={handleStop} title="Stop">
              <StopIcon />
            </IconButton>
            ) || state === TaskState.Idle && (
            <IconButton onClick={handleStart} title="Start">
              <PlayArrowIcon />
            </IconButton>
            )}
          </Box>
          <Box display="flex" pl={1} alignItems="center">
            <TaskStatusIcon task={task} />
          </Box>
          <Box display="flex" pl={1} alignItems="center">
            <KeyboardArrowRightIcon />
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default TaskItem;
