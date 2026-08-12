import React, {FC, useCallback} from 'react';
import {Dialog, useMediaQuery, useTheme} from '@mui/material';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleUpdate = useCallback(async () => {
    await onUpdate();
  }, [onUpdate]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      fullScreen={isMobile}
      maxWidth="md"
      scroll="paper"
    >
      <TaskDialogView task={task} onUpdate={handleUpdate} onClose={onClose} />
    </Dialog>
  );
};

export default TaskDialog;
