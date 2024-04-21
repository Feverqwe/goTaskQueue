import React, {FC, useCallback, useEffect, useRef} from 'react';
import {Box, Button, CircularProgress, Dialog, DialogActions} from '@mui/material';
import {observer} from 'mobx-react-lite';
import DisplayError from '../DisplayError';
import useTaskStore from '../../hooks/useTaskStore';
import TaskDialogView from './TaskDialogView';
import SilentStatus from '../SilentStatus/SilentStatus';

interface TaskDialogBaseProps {
  taskId: string;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface TaskDialogWithStoreProps extends TaskDialogBaseProps {
  taskStore: ReturnType<typeof useTaskStore>;
}

type TaskDialogProps = TaskDialogBaseProps | TaskDialogWithStoreProps;

const TaskDialog: FC<TaskDialogProps> = (props) => {
  const {
    taskId,
    open,
    onClose,
    onUpdate,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    taskStore = useTaskStore(),
  } = props as TaskDialogWithStoreProps;

  const {task, loading, error, fetchTask} = taskStore;

  const refTaskStore = useRef(taskStore);
  refTaskStore.current = taskStore;

  useEffect(() => {
    fetchTask(taskId);
    return () => refTaskStore.current.abortController?.abort();
  }, [taskId, fetchTask]);

  const handleRetry = useCallback(async () => {
    await fetchTask(taskId);
  }, [taskId, fetchTask]);

  const handleUpdate = useCallback(async () => {
    await fetchTask(taskId);
    await onUpdate?.();
  }, [taskId, onUpdate, fetchTask]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      {loading && !task && (
        <Box p={1} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      )}
      {loading && task ? <SilentStatus status="loading" /> : null}
      {error && (
        <Box p={1} display="flex" justifyContent="center">
          <DisplayError error={error} onRetry={handleRetry} back={true} />
        </Box>
      )}
      {task ? (
        <TaskDialogView task={task} onUpdate={handleUpdate} onClose={onClose} />
      ) : (
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default observer(TaskDialog);
