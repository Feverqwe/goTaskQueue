import React, {FC, useCallback, useEffect, useMemo, useRef} from 'react';
import {Box, CircularProgress, Container} from '@mui/material';
import {observer, useLocalObservable} from 'mobx-react-lite';
import TaskItem from './components/TaskItem';
import TemplatesBar from './components/TemplatesBar/TemplatesBar';
import {Task} from '../types';
import {api} from '../../tools/api';
import {ApiError, HTTPError} from '../../tools/apiRequest';
import DisplayError from '../DisplayError';
import {useVisibility} from '../../hooks/useVisibility';

interface TaskListProps {

}

const TaskList: FC<TaskListProps> = () => {
  const isVisible = useVisibility();
  const refInit = useRef(true);

  const {loading, error, taskList, fetchTaskList} = useLocalObservable(() => ({
    loading: true,
    error: null as null | HTTPError | ApiError | TypeError,
    taskList: null as null | Task[],
    async fetchTaskList(silent = false) {
      if (!silent) {
        this.loading = true;
      }
      this.error = null;
      try {
        const taskList = await api.tasks();
        taskList.reverse();
        this.taskList = taskList;
      } catch (err) {
        console.error('fetchTaskList error: %O', err);
        this.error = err as ApiError;
      } finally {
        this.loading = false;
      }
    },
  }));

  useMemo(() => {
    document.title = 'TaskQueue';
  }, []);

  const handleUpdate = useCallback(() => {
    fetchTaskList(true);
  }, [fetchTaskList]);

  useEffect(() => {
    fetchTaskList();
  }, [fetchTaskList]);

  useEffect(() => {
    if (!isVisible) return;
    const run = () => fetchTaskList(true);
    const intervalId = setInterval(run, 10 * 1000);
    const isInit = refInit.current;
    refInit.current = false;
    if (!isInit) {
      run();
    }
    return () => clearInterval(intervalId);
  }, [fetchTaskList, isVisible]);

  const handleRetry = useCallback(() => {
    fetchTaskList();
  }, [fetchTaskList]);

  return (
    <Container maxWidth={false} disableGutters={true}>
      <TemplatesBar onUpdate={handleUpdate} />
      <>
        {loading && (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Box display="flex" justifyContent="center">
            <DisplayError error={error || new Error('asd')} onRetry={handleRetry} />
          </Box>
        )}
        {taskList && !error && (
          taskList.map((task) => <TaskItem key={task.id} task={task} onUpdate={handleUpdate} />)
        )}
      </>
    </Container>
  );
};

export default observer(TaskList);
