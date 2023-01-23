import {handleApiResponse} from './apiRequest';
import {Task} from '../components/types';
import {Template} from '../components/RootStore/RootStoreProvider';

interface ActionParams {
  method?: 'GET' | 'POST',
  path: string,
}

function action<RequestParams = unknown, ResponseData = unknown>({method = 'GET', path}: ActionParams) {
  return async (params: RequestParams): Promise<ResponseData> => {
    let query = '';
    let body;
    if (method === 'POST') {
      body = JSON.stringify(params);
    } else
    if (params) {
      query = new URLSearchParams(params).toString();
    }

    return fetch(path + (query ? `?${query}` : ''), {
      method,
      body,
    }).then(handleApiResponse<ResponseData>);
  };
}

interface TaskId {
  id: string,
}

export const api = {
  tasks: action<void, Task[]>({
    path: '/api/tasks',
  }),
  task: action<TaskId, Task>({
    path: '/api/task',
  }),
  add: action<{command: string, label: string, isPty: boolean, isOnlyCombined: boolean}, Task>({
    method: 'POST',
    path: '/api/add',
  }),
  clone: action<TaskId, Task>({
    method: 'POST',
    path: '/api/clone',
  }),
  delete: action<TaskId, string>({
    method: 'POST',
    path: '/api/delete',
  }),
  taskRun: action<TaskId, string>({
    method: 'POST',
    path: '/api/task/run',
  }),
  taskKill: action<TaskId, string>({
    method: 'POST',
    path: '/api/task/kill',
  }),
  taskSignal: action<{id: string, signal: 'SIGINT'}, string>({
    method: 'POST',
    path: '/api/task/signal',
  }),
  setTaskLabel: action<{id: string, label: string}, string>({
    method: 'POST',
    path: '/api/task/setLabel',
  }),
  addTaskLink: action<{id: string, name: string, type: string, url: string, title: string}, string>({
    method: 'POST',
    path: '/api/task/addLink',
  }),
  delTaskLink: action<{id: string, name: string}, string>({
    method: 'POST',
    path: '/api/task/delLink',
  }),
  reloadConfig: action<void>({
    method: 'POST',
    path: '/api/reloadConfig',
  }),
  setTemplates: action<{templates: Template[]}>({
    method: 'POST',
    path: '/api/setTemplates',
  }),
  templates: action<void, Template[]>({
    method: 'GET',
    path: '/api/templates',
  }),
  memStorageGet: action<string[] | null, Record<string, unknown>>({
    method: 'POST',
    path: '/api/memStorage/get',
  }),
  memStorageSet: action<unknown, string>({
    method: 'POST',
    path: '/api/memStorage/set',
  }),
  memStorageDel: action<string[], string>({
    method: 'POST',
    path: '/api/memStorage/del',
  }),
};
