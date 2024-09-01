import React, {FC, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {Box, CircularProgress, Container} from '@mui/material';
import {observer} from 'mobx-react-lite';
import TemplatesBar from './components/TemplatesBar/TemplatesBar';
import DisplayError from '../../components/DisplayError';
import {useVisibility} from '../../hooks/useVisibility';
import TaskListView from './components/TaskListView';
import {RootStoreCtx} from '../../components/RootStore/RootStoreCtx';
import SilentStatus from '../../components/SilentStatus/SilentStatus';
import useTaskListStore from '../../hooks/useTaskListStore';

interface TaskListProps {}

const TaskList: FC<TaskListProps> = () => {
  const isVisible = useVisibility();
  const refInit = useRef(true);
  const rootStore = useContext(RootStoreCtx);
  const {name} = rootStore;

  const taskListStore = useTaskListStore();

  const {loading, silent, error, taskList, fetchTaskList, setTaskList} = taskListStore;

  const refTaskListStore = useRef(taskListStore);
  refTaskListStore.current = taskListStore;

  useMemo(() => {
    document.title = name;
  }, [name]);

  const handleUpdate = useCallback(() => {
    fetchTaskList(true);
  }, [fetchTaskList]);

  useEffect(() => {
    if (rootStore.tasks) {
      setTaskList(rootStore.tasks);
      rootStore.tasks = undefined;
    } else {
      fetchTaskList();
    }
    return () => refTaskListStore.current.abortController?.abort();
  }, [fetchTaskList, rootStore, setTaskList]);

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
      {silent && loading && <SilentStatus status="loading" />}
      {silent && error && <SilentStatus status="error" onRetry={handleUpdate} />}
    </Container>
  );
};

export default observer(TaskList);
