import {Box, CircularProgress, Container} from "@mui/material";
import React, {FC, useCallback, useContext, useEffect, useState} from "react";
import TaskHeader from "./components/TaskHeader";
import TaskLog from "./components/TaskLog";
import {observer, useLocalObservable} from "mobx-react-lite";
import {Task, TaskState} from "../types";
import {api} from "../../tools/api";
import {NotificationCtx} from "../Notifications/NotificationCtx";
import TaskInfo from "./components/TaskInfo";

const TaskPage: FC = () => {
  const id = new URLSearchParams(location.search).get('id');
  const [remapNewLine, setRemapNewLine] = useState(true);
  const [showInfo, setInfo] = useState(false);
  const notification = useContext(NotificationCtx);

  const {task, loading, fetchTask} = useLocalObservable(() => ({
    task: null as null | Task,
    loading: true,
    async fetchTask(id: string, silent = false) {
      if (!silent) {
        this.loading = true;
      }
      try {
        this.task = await api.task({id})
      } catch (err) {
        this.task = null;
        console.error(err);
      } finally {
        this.loading = false;
      }
    }
  }));

  const handleUpdate = useCallback(() => {
    if (!task) return;
    fetchTask(task.id, true);
  }, [task, fetchTask]);

  useEffect(() => {
    if (!id) return;

    fetchTask(id);
  }, [id, fetchTask]);

  useEffect(() => {
    const complete = [TaskState.Finished, TaskState.Error, TaskState.Canceled];
    const taskState = task?.state;
    if (!taskState || complete.includes(taskState)) return;
    return () => {
      if (task && complete.includes(task.state)) {
        notification(task);
      }
    };
  }, [task?.state]);

  const handleToggleFixNewLine = useCallback(() => {
    setRemapNewLine(v => !v);
  }, []);

  const handleToggleInfo = useCallback(() => {
    setInfo(v => !v);
  }, []);

  return (
    <Container maxWidth={false} disableGutters={true} sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      {loading && (
        <Box p={1} display={'flex'} justifyContent={'center'}>
          <CircularProgress />
        </Box>
      )}
      {!loading && !task && (
        <Box p={1} display={'flex'} justifyContent={'center'}>
          Task not found
        </Box>
      )}
      {task && (
        <>
          <TaskHeader task={task} remapNewLine={remapNewLine} onToggleInfo={handleToggleInfo} onToggleFixNewLine={handleToggleFixNewLine} onUpdate={handleUpdate}/>
          {showInfo && (
            <TaskInfo task={task} />
          )}
          <TaskLog task={task} remapNewLine={remapNewLine} onUpdate={handleUpdate}/>
        </>
      )}
    </Container>
  );
};

export default observer(TaskPage);