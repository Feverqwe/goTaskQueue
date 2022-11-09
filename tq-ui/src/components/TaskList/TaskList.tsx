import React, {FC, useCallback, useEffect} from 'react';
import {Box, CircularProgress, Container} from '@mui/material';
import {observer, useLocalObservable} from 'mobx-react-lite';
import TaskItem from './components/TaskItem';
import TaskInput from './components/TaskInput';
import {Task} from '../types';
import {api} from '../../tools/api';

interface TaskListProps {

}

const TaskList: FC<TaskListProps> = () => {
  const {loading, taskList, fetchTaskList} = useLocalObservable(() => ({
    loading: true,
    taskList: [] as Task[],
    async fetchTaskList(silent = false) {
      if (!silent) {
        this.loading = true;
      }
      try {
        const taskList = await api.tasks();
        taskList.reverse();
        this.taskList = taskList;
      } finally {
        this.loading = false;
      }
    },
  }));

  const handleUpdate = useCallback(() => {
    fetchTaskList(true);
  }, [fetchTaskList]);

  useEffect(() => {
    fetchTaskList();
  }, [fetchTaskList]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTaskList(true);
    }, 10 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchTaskList]);

  return (
    <Container maxWidth={false} disableGutters={true}>
      <TaskInput onUpdate={handleUpdate} />
      <>
        {loading && (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        )}
        {!loading && (
          taskList.map((task) => <TaskItem key={task.id} task={task} onUpdate={handleUpdate} />)
        )}
      </>
    </Container>
  );
};

export default observer(TaskList);
