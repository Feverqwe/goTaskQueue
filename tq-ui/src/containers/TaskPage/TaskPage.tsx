import {Box, CircularProgress, Container} from '@mui/material';
import React, {FC, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {observer, useLocalObservable} from 'mobx-react-lite';
import {useLocation} from 'react-router-dom';
import {runInAction} from 'mobx';
import {Task, TaskState} from '../../components/types';
import {api} from '../../tools/api';
import {NotificationCtx} from '../../components/Notifications/NotificationCtx';
import {ApiError, HTTPError} from '../../tools/apiRequest';
import DisplayError from '../../components/DisplayError';
import TaskView from './components/TaskView';
import NotificationProvider from '../../components/Notifications/NotificationProvider';

const completeStates = [TaskState.Finished, TaskState.Error, TaskState.Canceled];

const TaskPage: FC = () => {
  const location = useLocation();
  const id = useMemo(() => new URLSearchParams(location.search).get('id'), [location.search]);
  const notification = useContext(NotificationCtx);

  const {task, loading, silent, error, fetchTask} = useLocalObservable(() => ({
    task: null as null | Task,
    loading: true,
    error: null as null | HTTPError | ApiError | TypeError,
    silent: false,
    abortController: null as null | AbortController,
    async fetchTask(id: string, silent = false) {
      if (this.abortController) {
        this.abortController.abort();
      }

      this.silent = silent;
      this.loading = true;
      this.error = null;
      const abortController = new AbortController();
      this.abortController = abortController;
      try {
        const task = await api.task(
          {id},
          {
            signal: this.abortController.signal,
          },
        );
        runInAction(() => {
          this.task = task;
        });
      } catch (err) {
        console.error('fetchTask error: %O', err);
        runInAction(() => {
          if (this.abortController !== abortController) return;
          this.error = err as ApiError;
        });
      } finally {
        runInAction(() => {
          if (this.abortController !== abortController) return;
          this.loading = false;
        });
      }
    },
  }));

  const refTask = useRef<Task>();
  refTask.current = task || undefined;

  const handleUpdate = useCallback(() => {
    const task = refTask.current;
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
  }, [id, fetchTask]);

  useEffect(() => {
    const taskState = task?.state;
    if (!taskState || completeStates.includes(taskState)) return () => {};
    return () => {
      const currentTask = refTask.current;
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
        {error && (
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
