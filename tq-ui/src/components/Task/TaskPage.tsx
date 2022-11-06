import {Box, CircularProgress, Container} from "@mui/material";
import React, {FC, useCallback, useContext, useEffect} from "react";
import TaskHeader from "./components/TaskHeader";
import TaskLog from "./components/TaskLog";
import {observer, useLocalObservable} from "mobx-react-lite";
import {Task, TaskState} from "../types";
import {api} from "../../tools/api";
import {NotificationCtx} from "../Notifications/NotificationCtx";

const TaskPage: FC = () => {
  const id = new URLSearchParams(location.search).get('id');
  const notification = useContext(NotificationCtx);

  const state = useLocalObservable(() => ({
    task: null as null | Task,
    loading: true,
    async fetchTask(id: string, silent = false) {
      if (!silent) {
        this.loading = true;
      }
      try {
        this.task = await api.task({id})
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
      }
    }
  }));

  const handleUpdate = useCallback(() => {
    if (!state.task) return;
    state.fetchTask(state.task.id, true);
  }, [state]);

  useEffect(() => {
    if (!id) return;

    state.fetchTask(id);
  }, [id]);

  useEffect(() => {
    const complete = [TaskState.Finished, TaskState.Error, TaskState.Canceled];
    const taskState = state.task?.state;
    if (!taskState || complete.includes(taskState)) return;
    return () => {
      if (state.task && complete.includes(state.task.state)) {
        notification(state.task);
      }
    };
  }, [state.task?.state]);

  return (
    <Container maxWidth={false} disableGutters={true} sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      {state.loading && (
        <Box p={1} display={'flex'} justifyContent={'center'}>
          <CircularProgress />
        </Box>
      )}
      {state.task && (
        <>
          <TaskHeader task={state.task} onUpdate={handleUpdate}/>
          <TaskLog task={state.task} onUpdate={handleUpdate}/>
        </>
      )}
    </Container>
  );
};

export default observer(TaskPage);