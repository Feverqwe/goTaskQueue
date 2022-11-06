import React, {FC, useCallback, useEffect} from "react";
import {Box, CircularProgress, Container} from "@mui/material";
import TaskItem from "./components/TaskItem";
import TaskInput from "./components/TaskInput";
import {observer, useLocalObservable} from "mobx-react-lite";
import {Task} from "../types";
import {api} from "../../tools/api";

interface TaskListProps {

}

const TaskList: FC<TaskListProps> = () => {
  const state = useLocalObservable(() => ({
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
    state.fetchTaskList(true);
  }, [state]);

  useEffect(() => {
    state.fetchTaskList();
  }, [state]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      state.fetchTaskList(true);
    }, 30 * 1000);
    return () => clearInterval(intervalId);
  }, [state]);

  return (
    <Container maxWidth={false} disableGutters={true}>
      <TaskInput onUpdate={handleUpdate}/>
      <>
        {state.loading && (
          <Box display={'flex'} justifyContent={'center'}>
            <CircularProgress />
          </Box>
        )}
        {!state.loading && (
          state.taskList.map((task) =>
            <TaskItem key={task.id} task={task} onUpdate={handleUpdate}/>
          )
        )}
      </>
    </Container>
  );
}

export default observer(TaskList);