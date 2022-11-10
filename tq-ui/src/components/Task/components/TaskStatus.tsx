import React, {FC, Fragment} from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BlockIcon from '@mui/icons-material/Block';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import {Task, TaskState} from '../../types';

interface TaskStatusProps {
  task: Pick<Task, 'state'>
}

const TaskStatusIcon: FC<TaskStatusProps> = ({task: {state}}) => {
  switch (state) {
    case TaskState.Finished: {
      return <CheckCircleIcon color="success" />;
    }
    case TaskState.Error: {
      return <ErrorOutlineIcon color="error" />;
    }
    case TaskState.Canceled: {
      return <BlockIcon color="disabled" />;
    }
    case TaskState.Started: {
      return <HourglassEmptyIcon color="info" />;
    }
    case TaskState.Idle: {
      return <FiberManualRecordIcon color="warning" />;
    }
    default: {
      return null;
    }
  }
};

export default TaskStatusIcon;
