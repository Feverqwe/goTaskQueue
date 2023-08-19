import React, {FC} from 'react';
import {Typography} from '@mui/material';
import {Task} from '../../../components/types';
import {getTaskName} from '../utils';

interface TaskNameProp {
  task: Pick<Task, 'label' | 'command'>;
}

const TaskName: FC<TaskNameProp> = ({task}) => {
  return <Typography variant="body1">{getTaskName(task)}</Typography>;
};

export default TaskName;
