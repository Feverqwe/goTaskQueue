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

const completeStates = [TaskState.Finished, TaskState.Error, TaskState.Canceled];

const TaskPage: FC = () => {
  const location = useLocation();
  const id = useMemo(() => new URLSearchParams(location.search).get('id'), [location.search]);
  const notification = useContext(NotificationCtx);

  const taskStore = useTaskStore();
  const {task, loading, silent, error, fetchTask} = taskStore;

  const refTaskStore = useRef(taskStore);
  refTaskStore.current = taskStore;

  const handleUpdate = useCallback(() => {
    const {task} = refTaskStore.current;
    if (!task) return;
    fetchTask(task.id, true);
  }, [fetchTask]);

  useEffect(() => {
    document.body.classList.add('task-page');
    return () => {
      document.body.classList.remove('task-page');
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchTask(id);
    return () => refTaskStore.current.abortController?.abort();
  }, [id, fetchTask]);

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
        {!silent && loading && (
          <Box p={1} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        )}
        {!silent && error && (
          <Box p={1} display="flex" justifyContent="center">
            <DisplayError error={error} onRetry={handleRetry} back={true} />
          </Box>
        )}
        {(silent || !error) && task && <TaskView task={task} onUpdate={handleUpdate} />}
      </Container>
    </NotificationProvider>
  );
};

export default observer(TaskPage);
