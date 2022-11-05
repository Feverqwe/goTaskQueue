import React, {FC, useCallback, useEffect} from "react";
import {Container} from "@mui/material";
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
    async fetchTaskList() {
      this.loading = true;
      try {
        this.taskList = await api.tasks();
      } finally {
        this.loading = false;
      }
    },
  }));

  const handleUpdate = useCallback(() => {
    state.fetchTaskList();
  }, []);

  useEffect(() => {
    state.fetchTaskList();
  }, []);

  return (
    <Container maxWidth={false} disableGutters={true}>
      <TaskInput onUpdate={handleUpdate}/>
      <>
        {state.loading && (
          'Loading...'
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