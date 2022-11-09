import React, {FC, Fragment} from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BlockIcon from '@mui/icons-material/Block';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import {Task, TaskState} from '../../types';

interface TaskStatusProps {
  task: Task
}

const TaskStatusIcon: FC<TaskStatusProps> = ({task: {state}}) => {
  return (
    <>
      {state === TaskState.Finished ? (
        <CheckCircleIcon color="success" />
      ) : state === TaskState.Error ? (
        <ErrorOutlineIcon color="error" />
      ) : state === TaskState.Canceled ? (
        <BlockIcon color="disabled" />
      ) : state === TaskState.Started ? (
        <HourglassEmptyIcon color="info" />
      ) : state === TaskState.Idle ? (
        <FiberManualRecordIcon color="warning" />
      ) : null}
    </>
  );
};

export default TaskStatusIcon;
