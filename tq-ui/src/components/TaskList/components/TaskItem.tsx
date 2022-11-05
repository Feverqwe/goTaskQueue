import {Box, Card, CardActionArea, IconButton} from "@mui/material";
import React, {FC, SyntheticEvent, useCallback} from "react";
import {Task, TaskState} from "../../types";
import {api} from "../../../tools/api";
import TaskStatusIcon from "./TaskStatus";
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ClearIcon from '@mui/icons-material/Clear';

interface TaskItemProps {
  task: Task,
  onUpdate: () => void;
}

const TaskItem: FC<TaskItemProps> = ({task, onUpdate}) => {
  const {id, command, state} = task;

  const handleDelete = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await api.delete({id});
    onUpdate();
  }, [id]);

  return (
    <Box px={1} pb={1}>
      <Card>
        <CardActionArea href={"task.html?id=" + id}>
          <Box display={'flex'} flexDirection={'row'} alignItems={'center'}>
            <Box display={'flex'}>
              <IconButton disabled={state === TaskState.Started} onClick={handleDelete}>
                <ClearIcon fontSize={'small'} />
              </IconButton>
            </Box>
            <Box display={'flex'} pl={1} flexGrow={1}>
              <Box sx={{wordBreak: "break-all"}}>
                {command}
              </Box>
            </Box>
            <Box display={'flex'} pl={1}>
              <TaskStatusIcon task={task}/>
            </Box>
            <Box display={'flex'} pl={1}>
              <IconButton>
                <KeyboardArrowRightIcon />
              </IconButton>
            </Box>
          </Box>
        </CardActionArea>
      </Card>
    </Box>
  );
}

export default TaskItem;