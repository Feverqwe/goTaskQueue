export enum TaskState {
  Canceled = 'CANCELED',
  Error = 'ERROR',
  Finished = 'FINISHED',
  Started = 'STARTED',
  Idle = 'IDLE',
}

export interface TaskLink {
  name: string;
  type: string;
  url: string;
  title: string;
}

export interface Task {
  id: string;
  command: string;
  label: string;
  state: TaskState;
  error: string;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
  isPty: boolean;
  links: TaskLink[];
}

export interface PtyScreenSize {
  x: number;
  y: number;
  cols: number;
  rows: number;
}
