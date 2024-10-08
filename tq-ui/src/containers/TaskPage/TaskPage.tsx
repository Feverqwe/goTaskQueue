import {Box, CircularProgress, Container} from '@mui/material';
import React, {FC, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {observer} from 'mobx-react-lite';
import {useLocation} from 'react-router-dom';
import {TaskState} from '../../components/types';
import {NotificationCtx} from '../../components/Notifications/NotificationCtx';
import DisplayError from '../../components/DisplayError';
import TaskView from './components/TaskView';
import NotificationProvider from '../../components/Notifications/NotificationProvider';
import useTaskStore from '../../hooks/useTaskStore';
import SilentStatus from '../../components/SilentStatus/SilentStatus';

const completeStates = [TaskState.Finished, TaskState.Error, TaskState.Canceled];

const TaskPage: FC = () => {
  const location = useLocation();
  const id = useMemo(() => new URLSearchParams(location.search).get('id'), [location.search]);
  const notification = useContext(NotificationCtx);

  const taskStore = useTaskStore();
  const {task, loading, error, fetchTask, setTask, isPreloaded} = taskStore;

  const refTaskStore = useRef(taskStore);
  refTaskStore.current = taskStore;

  const handleUpdate = useCallback(() => {
    const {task} = refTaskStore.current;
    if (!task) return;
    fetchTask(task.id);
  }, [fetchTask]);

  useEffect(() => {
    document.body.classList.add('task-page');
    return () => {
      document.body.classList.remove('task-page');
    };
  }, []);

  useEffect(() => {
    if (!id || isPreloaded) return;
    fetchTask(id);
    return () => refTaskStore.current.abortController?.abort();
  }, [id, fetchTask, isPreloaded, setTask]);

  useEffect(() => {
    const taskState = task?.state;
    if (!taskState || completeStates.includes(taskState)) return () => {};
    return () => {
      const currentTask = refTaskStore.current.task;
      if (currentTask && completeStates.includes(currentTask.state)) {
        notification(currentTask);
      }
    };
  }, [notification, task?.state]);

  const handleRetry = useCallback(() => {
    if (id) {
      fetchTask(id);
    }
  }, [id, fetchTask]);

  return (
    <NotificationProvider>
      <Container
        maxWidth={false}
        disableGutters={true}
        sx={{display: 'flex', flexDirection: 'column', height: '100%'}}
      >
        {loading && !task ? (
          <Box p={1} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : null}
        {loading && task ? <SilentStatus status="loading" /> : null}
        {error && (
          <Box p={1} display="flex" justifyContent="center">
            <DisplayError error={error} onRetry={handleRetry} back={true} />
          </Box>
        )}
        {task && <TaskView task={task} onUpdate={handleUpdate} />}
      </Container>
    </NotificationProvider>
  );
};

export default observer(TaskPage);
