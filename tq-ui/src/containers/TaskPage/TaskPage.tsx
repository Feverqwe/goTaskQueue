import {Box, CircularProgress, Container} from '@mui/material';
import React, {FC, useCallback, useContext, useEffect, useMemo} from 'react';
import {useLocation} from 'react-router-dom';
import {Task, TaskState} from '../../components/types';
import {NotificationCtx, ToastInput} from '../../components/Notifications/NotificationCtx';
import DisplayError from '../../components/DisplayError';
import TaskView from './components/TaskView';
import useTaskQuery from '../../hooks/useTaskQuery';
import SilentStatus from '../../components/SilentStatus/SilentStatus';
import TaskRefreshAlert from './components/TaskRefreshAlert';
import {ApiError} from '../../tools/apiRequest';

const getCompletionToast = (task: Task): ToastInput | undefined => {
  const title = task.label.trim() || task.command.trim() || 'Unnamed task';

  switch (task.state) {
    case TaskState.Finished:
      return {severity: 'success', label: 'Task completed', title};
    case TaskState.Canceled:
      return {severity: 'warning', label: 'Task canceled', title};
    case TaskState.Error:
      return {
        severity: 'error',
        label: 'Task failed',
        title,
        message: task.error.trim() || 'The task stopped without an error message.',
      };
    default:
      return undefined;
  }
};

const TaskPage: FC = () => {
  const location = useLocation();
  const id = useMemo(() => new URLSearchParams(location.search).get('id'), [location.search]);
  const showToast = useContext(NotificationCtx);

  const {data: task, error, isFetching, isPending, refetch} = useTaskQuery(id);
  const visibleTask = error instanceof ApiError ? undefined : task;

  const handleUpdate = useCallback(async () => {
    if (!id) return undefined;
    const result = await refetch({throwOnError: true});
    return result.data;
  }, [id, refetch]);

  useEffect(() => {
    document.body.classList.add('task-page');
    return () => {
      document.body.classList.remove('task-page');
    };
  }, []);

  const handleComplete = useCallback(
    (completedTask: Task) => {
      const toast = getCompletionToast(completedTask);
      if (toast) showToast(toast);
    },
    [showToast],
  );

  const handleRetry = useCallback(() => {
    handleUpdate().catch(() => {});
  }, [handleUpdate]);

  const missingIdError = useMemo(() => new Error('Task id is missing'), []);
  const refreshError =
    visibleTask && error && !isFetching ? (
      <TaskRefreshAlert error={error} onRetry={handleRetry} />
    ) : null;

  return (
    <Container
      maxWidth={false}
      disableGutters={true}
      sx={{display: 'flex', flexDirection: 'column', height: '100%'}}
    >
      {id === null ? (
        <Box
          sx={{
            p: 1,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <DisplayError error={missingIdError} back={true} />
        </Box>
      ) : isPending || (!visibleTask && isFetching) ? (
        <Box
          sx={{
            p: 1,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      ) : null}
      {isFetching && visibleTask ? <SilentStatus status="loading" /> : null}
      {!visibleTask && error && !isFetching && (
        <Box
          sx={{
            p: 1,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <DisplayError error={error} onRetry={handleRetry} back={true} />
        </Box>
      )}
      {visibleTask && (
        <TaskView
          task={visibleTask}
          onUpdate={handleUpdate}
          onComplete={handleComplete}
          status={refreshError}
        />
      )}
    </Container>
  );
};

export default TaskPage;
