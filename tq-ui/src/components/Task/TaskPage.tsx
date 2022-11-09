import {Box, CircularProgress, Container} from '@mui/material';
import React, {FC, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {observer, useLocalObservable} from 'mobx-react-lite';
import TaskHeader from './components/TaskHeader';
import TaskLog from './components/TaskLog';
import {Task, TaskState} from '../types';
import {api} from '../../tools/api';
import {NotificationCtx} from '../Notifications/NotificationCtx';
import TaskInfo from './components/TaskInfo';

const completeStates = [TaskState.Finished, TaskState.Error, TaskState.Canceled];

const TaskPage: FC = () => {
  const id = new URLSearchParams(location.search).get('id');
  const [remapNewLine, setRemapNewLine] = useState(true);
  const [showInfo, setInfo] = useState(false);
  const notification = useContext(NotificationCtx);
  const refTask = useRef<Task>();

  const {task, loading, fetchTask} = useLocalObservable(() => ({
    task: null as null | Task,
    loading: true,
    async fetchTask(id: string, silent = false) {
      if (!silent) {
        this.loading = true;
      }
      try {
        this.task = await api.task({id});
      } catch (err) {
        this.task = null;
        console.error(err);
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

  const handleToggleFixNewLine = useCallback(() => {
    setRemapNewLine((v) => !v);
  }, []);

  const handleToggleInfo = useCallback(() => {
    setInfo((v) => !v);
  }, []);

  return (
    <Container maxWidth={false} disableGutters={true} sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      {loading && (
        <Box p={1} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      )}
      {!loading && !task && (
        <Box p={1} display="flex" justifyContent="center">
          Task not found
        </Box>
      )}
      {task && (
        <>
          <TaskHeader task={task} remapNewLine={remapNewLine} onToggleInfo={handleToggleInfo} onToggleFixNewLine={handleToggleFixNewLine} onUpdate={handleUpdate} />
          {showInfo && (
            <TaskInfo task={task} />
          )}
          <TaskLog task={task} remapNewLine={remapNewLine} onUpdate={handleUpdate} />
        </>
      )}
    </Container>
  );
};

export default observer(TaskPage);
