import React, {FC, useCallback, useContext, useMemo} from 'react';
import {Box, CircularProgress, Container} from '@mui/material';
import TemplatesBar from './components/TemplatesBar/TemplatesBar';
import DisplayError from '../../components/DisplayError';
import TaskListView from './components/TaskListView';
import {RootStoreCtx} from '../../components/RootStore/RootStoreCtx';
import SilentStatus from '../../components/SilentStatus/SilentStatus';
import useTaskListQuery from '../../hooks/useTaskListQuery';

const TaskList: FC = () => {
  const {name} = useContext(RootStoreCtx);
  const {data: taskList, error, isFetching, isPending, refetch} = useTaskListQuery();
  const hasTaskList = taskList !== undefined;

  useMemo(() => {
    document.title = name;
  }, [name]);

  const handleUpdate = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <Container maxWidth={false} disableGutters={true}>
      <Box
        sx={{
          pt: 1,
        }}
      >
        <TemplatesBar onUpdate={handleUpdate} />
      </Box>
      <>
        {isPending && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        )}
        {!hasTaskList && error && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <DisplayError error={error} onRetry={handleRetry} />
          </Box>
        )}
        {taskList && <TaskListView taskList={taskList} onUpdate={handleUpdate} />}
      </>
      {hasTaskList && isFetching && <SilentStatus status="loading" />}
      {hasTaskList && error && !isFetching && (
        <SilentStatus status="error" onRetry={handleUpdate} />
      )}
    </Container>
  );
};

export default TaskList;
