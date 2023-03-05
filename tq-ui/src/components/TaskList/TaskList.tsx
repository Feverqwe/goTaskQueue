import React, {FC, useCallback, useEffect, useMemo, useRef} from 'react';
import {Box, CircularProgress, Container, IconButton} from '@mui/material';
import {observer, useLocalObservable} from 'mobx-react-lite';
import styled from '@emotion/styled';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TemplatesBar from './components/TemplatesBar/TemplatesBar';
import {TaskOrGroup} from '../types';
import {api} from '../../tools/api';
import {ApiError, HTTPError} from '../../tools/apiRequest';
import DisplayError from '../DisplayError';
import {useVisibility} from '../../hooks/useVisibility';
import {groupTasks} from './utils';
import TaskListView from './components/TaskListView';

const SilenStatus = styled(Box)(() => {
  return {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
  };
});

interface TaskListProps {}

const TaskList: FC<TaskListProps> = () => {
  const isVisible = useVisibility();
  const refInit = useRef(true);

  const {loading, silentLoading, error, silentError, taskList, fetchTaskList} = useLocalObservable(
    () => ({
      silentLoading: false,
      silentError: null as null | HTTPError | ApiError | TypeError,
      loading: true,
      error: null as null | HTTPError | ApiError | TypeError,
      taskList: null as null | TaskOrGroup[],
      async fetchTaskList(isSilent = false) {
        if (isSilent) {
          this.silentLoading = true;
        } else {
          this.loading = true;
        }

        try {
          const taskList = await api.tasks();
          taskList.reverse();
          this.taskList = groupTasks(taskList);

          this.silentError = null;
          this.error = null;
        } catch (err) {
          console.error('fetchTaskList error: %O', err);

          if (isSilent) {
            this.silentError = err as ApiError;
          } else {
            this.error = err as ApiError;
          }
        } finally {
          if (isSilent) {
            this.silentLoading = false;
          } else {
            this.loading = false;
          }
        }
      },
    }),
  );

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
        {!loading && error && (
          <Box display="flex" justifyContent="center">
            <DisplayError error={error} onRetry={handleRetry} />
          </Box>
        )}
        {!loading && !error && taskList && (
          <TaskListView taskList={taskList} onUpdate={handleUpdate} />
        )}
      </>
      {silentLoading && (
        <SilenStatus>
          <Box m={1} display="flex">
            <CircularProgress size={20} />
          </Box>
        </SilenStatus>
      )}
      {!silentLoading && silentError && (
        <SilenStatus>
          <IconButton size="small" color="warning" onClick={handleUpdate}>
            <ErrorOutlineIcon />
          </IconButton>
        </SilenStatus>
      )}
    </Container>
  );
};

export default observer(TaskList);
