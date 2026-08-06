import React, {FC} from 'react';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import BlockIcon from '@mui/icons-material/Block';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import {SvgIconProps} from '@mui/material';
import {Task, TaskState} from '../../../components/types';

const typeIcon = {
  [TaskState.Finished]: CheckCircleOutlinedIcon,
  [TaskState.Error]: ErrorOutlinedIcon,
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
}

const TaskStatusIcon: FC<TaskStatusProps> = ({task: {state}}) => {
  const Icon = typeIcon[state];
  return <Icon color={typeColor[state]} />;
};

export default TaskStatusIcon;
