import {useLocalObservable} from 'mobx-react-lite';
import {runInAction} from 'mobx';
import {useContext} from 'react';
import {ApiError, HTTPError} from '../tools/apiRequest';
import {Task, TaskOrGroup} from '../components/types';
import {api} from '../tools/api';
import {groupTasks} from '../containers/TaskList/utils';
import {isAbortError} from '../utils/common';
import {RootStoreCtx} from '../components/RootStore/RootStoreCtx';

const useTaskListStore = () => {
  const rootStore = useContext(RootStoreCtx);
  let initTaskList: null | TaskOrGroup[] = null;
  if (rootStore.tasks) {
    const initTasks = rootStore.tasks;
    initTasks.reverse();
    initTaskList = groupTasks(initTasks);
    rootStore.tasks = undefined;
  }

  return useLocalObservable(() => ({
    isPreloaded: !!initTaskList,
    silent: false,
    loading: !initTaskList,
    error: null as null | HTTPError | ApiError | TypeError,
    taskList: initTaskList,
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
        const tasks = await api.tasks(undefined, {
          signal: this.abortController.signal,
        });
        runInAction(() => {
          tasks.reverse();
          this.taskList = groupTasks(tasks);
        });
      } catch (err) {
        if (isAbortError(err)) return;
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
    setTaskList(tasks: Task[]) {
      tasks.reverse();
      this.taskList = groupTasks(tasks);
      this.error = null;
      this.loading = false;
    },
  }));
};

export default useTaskListStore;
