import {handleApiResponse} from './apiRequest';
import {AddTaskRequest, Task, RawTemplate, CloneTaskRequest, TaskId} from '../components/types';

interface ActionParams {
  method?: 'GET' | 'POST';
  path: string;
}

function action<RequestParams = unknown, ResponseData = unknown>({
  method = 'GET',
  path,
}: ActionParams) {
  return async (params: RequestParams): Promise<ResponseData> => {
    let query = '';
    let body;
    if (method === 'POST') {
      body = JSON.stringify(params);
    } else if (params) {
      query = new URLSearchParams(params).toString();
    }

    return fetch(path + (query ? `?${query}` : ''), {
      method,
      body,
    }).then(handleApiResponse<ResponseData>);
  };
}

export const api = {
  tasks: action<void, Task[]>({
    path: '/api/tasks',
  }),
  task: action<TaskId, Task>({
    path: '/api/task',
  }),
  add: action<AddTaskRequest, Task>({
    method: 'POST',
    path: '/api/add',
  }),
  clone: action<CloneTaskRequest, Task>({
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
  taskSignal: action<{id: string; signal: number}, string>({
    method: 'POST',
    path: '/api/task/signal',
  }),
  setTaskLabel: action<{id: string; label: string}, string>({
    method: 'POST',
    path: '/api/task/setLabel',
  }),
  addTaskLink: action<{id: string; name: string; type: string; url: string; title: string}, string>(
    {
      method: 'POST',
      path: '/api/task/addLink',
    },
  ),
  delTaskLink: action<{id: string; name: string}, string>({
    method: 'POST',
    path: '/api/task/delLink',
  }),
  reloadConfig: action<void>({
    method: 'POST',
    path: '/api/reloadConfig',
  }),
  reloadTemplates: action<void>({
    method: 'POST',
    path: '/api/reloadTemplates',
  }),

  templates: action<void, RawTemplate[]>({
    method: 'GET',
    path: '/api/templates',
  }),
  getTemplate: action<{id: string}, RawTemplate>({
    method: 'GET',
    path: '/api/getTemplate',
  }),
  readTemplate: action<{place: string}, RawTemplate>({
    method: 'GET',
    path: '/api/readTemplate',
  }),
  setTemplate: action<{template: RawTemplate, prevPlace?: string}, string>({
    method: 'POST',
    path: '/api/setTemplate',
  }),
  moveTemplate: action<{from: string, to: string}, string>({
    method: 'POST',
    path: '/api/moveTemplate',
  }),
  removeTemplate: action<{place: string}, string>({
    method: 'POST',
    path: '/api/removeTemplate',
  }),
  getTemplateOrder: action<void, string[]>({
    method: 'GET',
    path: '/api/getTemplateOrder',
  }),
  setTemplateOrder: action<{templateOrder: string[]}, string>({
    method: 'POST',
    path: '/api/setTemplateOrder',
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
