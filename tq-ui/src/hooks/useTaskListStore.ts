import {useLocalObservable} from 'mobx-react-lite';
import {runInAction} from 'mobx';
import {ApiError, HTTPError} from '../tools/apiRequest';
import {TaskOrGroup} from '../components/types';
import {api} from '../tools/api';
import {groupTasks} from '../containers/TaskList/utils';
import {isAbortError} from '../utils/common';

const useTaskListStore = () => {
  return useLocalObservable(() => ({
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
  }));
};

export default useTaskListStore;
