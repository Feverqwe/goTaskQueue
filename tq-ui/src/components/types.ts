export interface RawTemplate {
  place: string;
  command: string;

  id?: string;
  label?: string;
  group?: string;
  name: string;
  variables: {
    name: string;
    value: string;
    defaultValue?: string;
  }[];
  isPty?: boolean;
  isOnlyCombined?: boolean;
  isWriteLogs?: boolean;
  isSingleInstance?: boolean;
  isStartOnBoot?: boolean;
}

export type Template = TemplateButton | TemplateFolder;

export enum TemplateType {
  Folder = 'folder',
  Button = 'button',
}

export interface TemplateFolder {
  type: TemplateType.Folder;
  place: string;
  name: string;
  templates: Template[];
}

export interface TemplateButton extends RawTemplate {
  type?: TemplateType.Button;
}

export interface RootStore {
  name: string;
  templates: RawTemplate[];
  templateOrder: string[];
  memStorage: Record<string, unknown>;
  isPtySupported: boolean;
}

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

export interface Task extends Omit<Required<RawTemplate>, 'place' | 'name' | 'variables'> {
  templatePlace: string;
  state: TaskState;
  error: string;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
  links: TaskLink[];
}

export interface PtyScreenSize {
  x: number;
  y: number;
  cols: number;
  rows: number;
}

export interface TaskGroup {
  name: string;
  taskList: Task[];
}

export type TaskOrGroup = Task | TaskGroup;

export interface TaskId {
  id: string;
}

export interface AddTaskRequest {
  templatePlace?: string;
  templateId?: string;
  variables?: Record<string, string>;
  command?: string;
  label?: string;
  group?: string;
  isPty?: boolean;
  isOnlyCombined?: boolean;
  isWriteLogs?: boolean;
  isSingleInstance?: boolean;
  isStartOnBoot?: boolean;
  isRun?: boolean;
}

export interface CloneTaskRequest extends TaskId {
  isRun?: boolean;
}
