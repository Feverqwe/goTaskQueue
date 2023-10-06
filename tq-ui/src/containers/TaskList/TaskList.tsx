import React, {FC, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {Box, CircularProgress, Container, IconButton} from '@mui/material';
import {observer, useLocalObservable} from 'mobx-react-lite';
import styled from '@emotion/styled';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {runInAction} from 'mobx';
import TemplatesBar from './components/TemplatesBar/TemplatesBar';
import {TaskOrGroup} from '../../components/types';
import {api} from '../../tools/api';
import {ApiError, HTTPError} from '../../tools/apiRequest';
import DisplayError from '../../components/DisplayError';
import {useVisibility} from '../../hooks/useVisibility';
import {groupTasks} from './utils';
import TaskListView from './components/TaskListView';
import {RootStoreCtx} from '../../components/RootStore/RootStoreCtx';

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
  const {name} = useContext(RootStoreCtx);

  const {loading, silent, error, taskList, fetchTaskList} = useLocalObservable(
    () => ({
      silent: false,
      loading: true,
      error: null as null | HTTPError | ApiError | TypeError,
      taskList: null as null | TaskOrGroup[],
      abortController: null as null | AbortController,
      async fetchTaskList(isSilent = false) {
        if (this.abortController) {
          this.abortController.abort();
        }

        this.silent = isSilent;
        this.loading = true;
        this.error = null;
        const abortController = new AbortController();
        this.abortController = abortController;
        try {
          const taskList = await api.tasks(undefined, {
            signal: this.abortController.signal,
          });
          taskList.reverse();
          runInAction(() => {
            this.taskList = groupTasks(taskList);
          });
        } catch (err) {
          console.error('fetchTaskList error: %O', err);
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
    }),
  );

  useMemo(() => {
    document.title = name;
  }, [name]);

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
      <Box pt={1}>
        <TemplatesBar onUpdate={handleUpdate} />
      </Box>
      <>
        {!silent && loading && (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        )}
        {!silent && error && (
          <Box display="flex" justifyContent="center">
            <DisplayError error={error} onRetry={handleRetry} />
          </Box>
        )}
        {(silent || (!error && !loading)) && taskList && (
          <TaskListView taskList={taskList} onUpdate={handleUpdate} />
        )}
      </>
      {silent && loading && (
        <SilenStatus>
          <Box m={1} display="flex">
            <CircularProgress size={20} />
          </Box>
        </SilenStatus>
      )}
      {silent && error && (
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
