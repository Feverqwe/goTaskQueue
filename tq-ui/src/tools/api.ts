import {handleApiResponse} from "./apiRequest";
import {Task} from "../components/types";

interface ActionParams {
  method?: 'GET' | 'POST',
  path: string,
}

function action<RequestParams = any, ResponseData = any>({method = 'GET', path}: ActionParams) {
  return async (params: RequestParams): Promise<ResponseData> => {
    let query = '';
    let body;
    if (params) {
      if (method === 'POST') {
        body = JSON.stringify(params);
      } else {
        query = new URLSearchParams(params).toString();
      }
    }

    return fetch(path + (query ? '?' + query : ''), {
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
    path: '/api/tasks'
  }),
  task: action<TaskId, Task>({
    path: '/api/task'
  }),
  add: action<{command: string, label: string}, Task>({
    method: 'POST',
    path: '/api/add'
  }),
  clone: action<TaskId, Task>({
    method: 'POST',
    path: '/api/clone'
  }),
  delete: action<TaskId, string>({
    method: 'POST',
    path: '/api/delete'
  }),
  taskRun: action<TaskId, string>({
    method: 'POST',
    path: '/api/task/run'
  }),
  taskKill: action<TaskId, string>({
    method: 'POST',
    path: '/api/task/kill'
  }),
  taskSignal: action<{id: string, signal: 'SIGINT'}, string>({
    method: 'POST',
    path: '/api/task/signal'
  }),
  taskSend: action<{id: string, data: string}>({
    method: 'POST',
    path: '/api/task/send'
  }),
  reloadConfig: action<void>({
    method: 'POST',
    path: '/api/reloadConfig'
  }),
};