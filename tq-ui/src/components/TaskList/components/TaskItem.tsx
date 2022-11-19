import {Box, Card, CardActionArea, IconButton} from '@mui/material';
import React, {FC, SyntheticEvent, useCallback} from 'react';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ClearIcon from '@mui/icons-material/Clear';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CopyAllIcon from '@mui/icons-material/CopyAll';
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
    e.preventDefault();
    e.stopPropagation();
    await api.delete({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStart = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await api.taskRun({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleStop = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await api.taskKill({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleClone = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await api.clone({id});
    onUpdate();
  }, [id, onUpdate]);

  const handleOpen = useCallback((e: SyntheticEvent) => {
    e.preventDefault();
    navigate(`task?id=${id}`);
  }, [navigate, id]);

  return (
    <Box px={1} pb={1}>
      <Card>
        <CardActionArea href={`task?id=${id}`} onClick={handleOpen}>
          <Box display="flex" flexDirection="row" alignItems="center">
            <Box display="flex">
              <IconButton disabled={state === TaskState.Started} onClick={handleDelete} title="Delete">
                <ClearIcon />
              </IconButton>
            </Box>
            <Box display="flex" pl={1} flexGrow={1}>
              <Box sx={{wordBreak: 'break-all'}}>
                <TaskName task={task} />
              </Box>
            </Box>
            {task.links.length > 0 && (
              <Box display="flex" pl={1}>
                <TaskLinks task={task} />
              </Box>
            )}
            <Box display="flex" pl={1}>
              {state === TaskState.Started && (
                <IconButton onClick={handleStop} title="Stop">
                  <StopIcon />
                </IconButton>
              ) || state === TaskState.Idle && (
                <IconButton onClick={handleStart} title="Start">
                  <PlayArrowIcon />
                </IconButton>
              ) || (
                <IconButton onClick={handleClone} title="Clone">
                  <CopyAllIcon />
                </IconButton>
              )}
            </Box>
            <Box display="flex" pl={1}>
              <TaskStatusIcon task={task} />
            </Box>
            <Box display="flex" pl={1}>
              <KeyboardArrowRightIcon />
            </Box>
          </Box>
        </CardActionArea>
      </Card>
    </Box>
  );
};

export default TaskItem;
