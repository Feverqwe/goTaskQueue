import React, {FC} from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BlockIcon from '@mui/icons-material/Block';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { SvgIconProps } from '@mui/material';
import {Task, TaskState} from '../../types';

const typeIcon = {
  [TaskState.Finished]: CheckCircleIcon,
  [TaskState.Error]: ErrorOutlineIcon,
  [TaskState.Canceled]: BlockIcon,
  [TaskState.Started]: HourglassEmptyIcon,
  [TaskState.Idle]: FiberManualRecordIcon,
};

const typeColor: Record<TaskState, SvgIconProps['color']> = {
  [TaskState.Finished]: 'success',
  [TaskState.Error]: 'error',
  [TaskState.Canceled]: 'disabled',
  [TaskState.Started]: 'info',
  [TaskState.Idle]: 'warning',
};

interface TaskStatusProps {
  task: Pick<Task, 'state'>;
  twoTone?: boolean;
}

const TaskStatusIcon: FC<TaskStatusProps> = ({task: {state}, twoTone}) => {
  const Icon = typeIcon[state];
  return <Icon color={typeColor[state]} />;
};

export default TaskStatusIcon;
