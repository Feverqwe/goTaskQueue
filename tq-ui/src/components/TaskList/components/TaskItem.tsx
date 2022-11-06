import {Box, Card, CardActionArea, IconButton} from "@mui/material";
import React, {FC, SyntheticEvent, useCallback} from "react";
import {Task, TaskState} from "../../types";
import {api} from "../../../tools/api";
import TaskStatusIcon from "./TaskStatus";
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ClearIcon from '@mui/icons-material/Clear';
import StopIcon from "@mui/icons-material/Stop";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CopyAllIcon from '@mui/icons-material/CopyAll';

interface TaskItemProps {
  task: Task,
  onUpdate: () => void;
}

const TaskItem: FC<TaskItemProps> = ({task, onUpdate}) => {
  const {id, command, label, state} = task;

  const handleDelete = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await api.delete({id});
    onUpdate();
  }, [id]);

  const handleStart = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await api.taskRun({id});
    onUpdate();
  }, [id]);

  const handleStop = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await api.taskKill({id});
    onUpdate();
  }, [id]);

  const handleClone = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await api.clone({id});
    onUpdate();
  }, [id]);

  return (
    <Box px={1} pb={1}>
      <Card>
        <CardActionArea href={"task.html?id=" + id}>
          <Box display={'flex'} flexDirection={'row'} alignItems={'center'}>
            <Box display={'flex'}>
              <IconButton disabled={state === TaskState.Started} onClick={handleDelete}>
                <ClearIcon/>
              </IconButton>
            </Box>
            <Box display={'flex'} pl={1} flexGrow={1}>
              <Box sx={{wordBreak: "break-all"}}>
                {label || command}
              </Box>
            </Box>
            <Box display={'flex'} pl={1}>
              {state === TaskState.Started && (
                <IconButton onClick={handleStop}>
                  <StopIcon/>
                </IconButton>
              ) || state === TaskState.Idle && (
                <IconButton onClick={handleStart}>
                  <PlayArrowIcon/>
                </IconButton>
              ) || (
                <IconButton onClick={handleClone}>
                  <CopyAllIcon/>
                </IconButton>
              )}
            </Box>
            <Box display={'flex'} pl={1}>
              <TaskStatusIcon task={task}/>
            </Box>
            <Box display={'flex'} pl={1}>
              <KeyboardArrowRightIcon />
            </Box>
          </Box>
        </CardActionArea>
      </Card>
    </Box>
  );
}

export default TaskItem;