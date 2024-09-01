import {useLocalObservable} from 'mobx-react-lite';
import {runInAction} from 'mobx';
import {Task} from '../components/types';
import {ApiError, HTTPError} from '../tools/apiRequest';
import {api} from '../tools/api';
import {isAbortError} from '../utils/common';

const useTaskStore = () => {
  return useLocalObservable(() => ({
    task: null as null | Task,
    loading: false,
    error: null as null | HTTPError | ApiError | TypeError,
    abortController: null as null | AbortController,
    async fetchTask(id: string) {
      if (this.abortController) {
        this.abortController.abort();
      }

      this.loading = true;
      this.error = null;
      const abortController = new AbortController();
      this.abortController = abortController;
      try {
        const task = await api.task(
          {id},
          {
            signal: this.abortController.signal,
          },
        );
        runInAction(() => {
          this.task = task;
        });
      } catch (err) {
        if (isAbortError(err)) return;
        console.error('fetchTask error: %O', err);
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
    setTask(task: Task) {
      this.loading = false;
      this.task = task;
      this.error = null;
    },
  }));
};

export default useTaskStore;
