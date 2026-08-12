import {Box, CircularProgress, Container} from '@mui/material';
import React, {FC, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {useLocation} from 'react-router-dom';
import {TaskState} from '../../components/types';
import {NotificationCtx} from '../../components/Notifications/NotificationCtx';
import DisplayError from '../../components/DisplayError';
import TaskView from './components/TaskView';
import NotificationProvider from '../../components/Notifications/NotificationProvider';
import useTaskQuery from '../../hooks/useTaskQuery';
import SilentStatus from '../../components/SilentStatus/SilentStatus';

const completeStates = [TaskState.Finished, TaskState.Error, TaskState.Canceled];

const TaskPage: FC = () => {
  const location = useLocation();
  const id = useMemo(() => new URLSearchParams(location.search).get('id'), [location.search]);
  const notification = useContext(NotificationCtx);

  const {data: task, error, isFetching, isPending, refetch} = useTaskQuery(id);
  const taskRef = useRef(task);
  taskRef.current = task;

  const handleUpdate = useCallback(async () => {
    if (!taskRef.current) return;
    await refetch();
  }, [refetch]);

  useEffect(() => {
    document.body.classList.add('task-page');
    return () => {
      document.body.classList.remove('task-page');
    };
  }, []);

  useEffect(() => {
    const taskState = task?.state;
    if (!taskState || completeStates.includes(taskState)) return () => {};
    return () => {
      const currentTask = taskRef.current;
      if (currentTask && completeStates.includes(currentTask.state)) {
        notification(currentTask);
      }
    };
  }, [notification, task?.state]);

  const handleRetry = useCallback(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  return (
    <NotificationProvider>
      <Container
        maxWidth={false}
        disableGutters={true}
        sx={{display: 'flex', flexDirection: 'column', height: '100%'}}
      >
        {isPending ? (
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
        {isFetching && task ? <SilentStatus status="loading" /> : null}
        {error && !isFetching && (
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
        {task && <TaskView task={task} onUpdate={handleUpdate} />}
      </Container>
    </NotificationProvider>
  );
};

export default TaskPage;
