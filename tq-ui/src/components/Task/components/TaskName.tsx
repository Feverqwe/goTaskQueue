import React, {FC} from 'react';
import {Typography} from '@mui/material';
import {Task} from '../../types';

interface TaskNameProp {
  task: Task;
}

const TaskName: FC<TaskNameProp> = ({task: {label, command}}) => {
  return (
    <Typography variant="body1">
      {label || command}
    </Typography>
  );
};

export default TaskName;
