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

export const api = {
  tasks: action<void, Task[]>({
    path: '/api/tasks'
  }),
  task: action<{id: string}, Task>({
    path: '/api/task'
  }),
  add: action<{command: string}, string>({
    method: 'POST',
    path: '/api/add'
  }),
  delete: action<{id: string}, string>({
    method: 'POST',
    path: '/api/delete'
  }),
  taskRun: action<{id: string}, string>({
    method: 'POST',
    path: '/api/task/run'
  }),
  taskKill: action<{id: string}, string>({
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
  })
};