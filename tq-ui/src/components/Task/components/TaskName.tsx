import React, {FC} from 'react';
import {Typography} from '@mui/material';
import {Task} from '../../types';

interface TaskNameProp {
  task: Pick<Task, 'label' | 'command'>;
}

const TaskName: FC<TaskNameProp> = ({task: {label, command}}) => {
  return (
    <Typography variant="body1">
      {label || command}
    </Typography>
  );
};

export default TaskName;
