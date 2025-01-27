import React, {FC, useCallback} from 'react';
import {Dialog} from '@mui/material';
import {observer} from 'mobx-react-lite';
import TaskDialogView from './TaskDialogView';
import {Task} from '../types';

interface TaskDialogBaseProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

type TaskDialogProps = TaskDialogBaseProps;

const TaskDialog: FC<TaskDialogProps> = (props) => {
  const {task, open, onClose, onUpdate} = props;

  const handleUpdate = useCallback(async () => {
    onUpdate();
  }, [onUpdate]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <TaskDialogView task={task} onUpdate={handleUpdate} onClose={onClose} />
    </Dialog>
  );
};

export default observer(TaskDialog);
