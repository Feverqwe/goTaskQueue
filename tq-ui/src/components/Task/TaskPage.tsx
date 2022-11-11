import {Box, Button, CircularProgress, Container} from '@mui/material';
import React, {FC, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {observer, useLocalObservable} from 'mobx-react-lite';
import TaskHeader from './components/TaskHeader';
import TaskLog from './components/TaskLog';
import {Task, TaskState} from '../types';
import {api} from '../../tools/api';
import {NotificationCtx} from '../Notifications/NotificationCtx';
import TaskInfo from './components/TaskInfo';
import {ApiError, HTTPError} from "../../tools/apiRequest";
import DisplayError from "../DisplayError";
import TaskView from "./components/TaskView";

const completeStates = [TaskState.Finished, TaskState.Error, TaskState.Canceled];

const TaskPage: FC = () => {
  const id = new URLSearchParams(location.search).get('id');
  const notification = useContext(NotificationCtx);
  const refTask = useRef<Task>();

  const {task, loading, error, fetchTask} = useLocalObservable(() => ({
    task: null as null | Task,
    loading: true,
    error: null as null | HTTPError | ApiError | TypeError,
    async fetchTask(id: string, silent = false) {
      if (!silent) {
        this.loading = true;
      }
      this.error = null;
      try {
        this.task = await api.task({id});
      } catch (err) {
        console.error('fetchTask error: %O', err);
        this.error = err as ApiError;
      } finally {
        this.loading = false;
      }
    },
  }));
  refTask.current = task || undefined;

  const handleUpdate = useCallback(() => {
    const task = refTask.current;
    if (!task) return;
    fetchTask(task.id, true);
  }, [fetchTask]);

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
    id && fetchTask(id);
  }, [id]);

  return (
    <Container maxWidth={false} disableGutters={true} sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      {loading && (
        <Box p={1} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Box p={1} display="flex" justifyContent="center">
          <DisplayError error={error} onRetry={handleRetry}/>
        </Box>
      )}
      {!error && task && (
        <TaskView task={task} onUpdate={handleUpdate}/>
      )}
    </Container>
  );
};

export default observer(TaskPage);
