import {useLocalObservable} from 'mobx-react-lite';
import {runInAction} from 'mobx';
import {Task} from '../components/types';
import {ApiError, HTTPError} from '../tools/apiRequest';
import {api} from '../tools/api';

const useTaskStore = () => {
  return useLocalObservable(() => ({
    task: null as null | Task,
    loading: true,
    error: null as null | HTTPError | ApiError | TypeError,
    silent: false,
    abortController: null as null | AbortController,
    async fetchTask(id: string, silent = false) {
      if (this.abortController) {
        this.abortController.abort();
      }

      this.silent = silent;
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
  }));
};

export default useTaskStore;