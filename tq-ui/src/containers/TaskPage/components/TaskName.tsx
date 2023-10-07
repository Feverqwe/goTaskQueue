import React, {FC} from 'react';
import {SxProps, Typography, TypographyVariant} from '@mui/material';
import {Task} from '../../../components/types';
import {getTaskName} from '../utils';

interface TaskNameProp {
  task: Pick<Task, 'label' | 'command'>;
  variant?: TypographyVariant;
  sx?: SxProps;
}

const TaskName: FC<TaskNameProp> = ({task, variant, sx}) => {
  return (
    <Typography variant={variant || 'body1'} sx={sx}>
      {getTaskName(task)}
    </Typography>
  );
};

export default TaskName;
