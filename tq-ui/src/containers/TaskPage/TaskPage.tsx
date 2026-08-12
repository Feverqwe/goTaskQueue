import {Box, CircularProgress, Container} from '@mui/material';
import React, {FC, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {useLocation} from 'react-router-dom';
import {Task, TaskState} from '../../components/types';
import {NotificationCtx} from '../../components/Notifications/NotificationCtx';
import DisplayError from '../../components/DisplayError';
import TaskView from './components/TaskView';
import NotificationProvider from '../../components/Notifications/NotificationProvider';
import useTaskQuery from '../../hooks/useTaskQuery';
import SilentStatus from '../../components/SilentStatus/SilentStatus';
import TaskRefreshAlert from './components/TaskRefreshAlert';
import {ApiError} from '../../tools/apiRequest';

const completeStates = [TaskState.Finished, TaskState.Error, TaskState.Canceled];

const TaskPageContent: FC = () => {
  const location = useLocation();
  const id = useMemo(() => new URLSearchParams(location.search).get('id'), [location.search]);
  const notification = useContext(NotificationCtx);

  const {data: task, error, isFetching, isPending, refetch} = useTaskQuery(id);
  const previousTaskRef = useRef<Task | undefined>(undefined);
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

  useEffect(() => {
    const previousTask = previousTaskRef.current;
    if (
      task &&
      previousTask?.id === task.id &&
      !completeStates.includes(previousTask.state) &&
      completeStates.includes(task.state)
    ) {
      notification(task);
    }
    previousTaskRef.current = task;
  }, [notification, task]);

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
      {visibleTask && <TaskView task={visibleTask} onUpdate={handleUpdate} status={refreshError} />}
    </Container>
  );
};

const TaskPage: FC = () => (
  <NotificationProvider>
    <TaskPageContent />
  </NotificationProvider>
);

export default TaskPage;
