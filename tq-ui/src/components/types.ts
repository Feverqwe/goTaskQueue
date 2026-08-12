export type TemplateVariableType = 'text' | 'select';

export interface TemplateVariable {
  name: string;
  value: string;
  defaultValue?: string;
  type?: TemplateVariableType;
  options?: string[];
}

export interface RawTemplate {
  place: string;
  command: string;

  id?: string;
  label?: string;
  group?: string;
  name: string;
  variables: TemplateVariable[];
  isPty?: boolean;
  isOnlyCombined?: boolean;
  isWriteLogs?: boolean;
  isSingleInstance?: boolean;
  isStartOnBoot?: boolean;
  ttl?: number;
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
  tasks: Task[] | null;
  task?: Task;
}

export enum TaskState {
  Canceled = 'CANCELED',
  Error = 'ERROR',
  Finished = 'FINISHED',
  Started = 'STARTED',
  Idle = 'IDLE',
}

export type CleanupStatuses = TaskState.Canceled | TaskState.Error | TaskState.Finished;

export interface TaskLink {
  name: string;
  type: string;
  url: string;
  title: string;
}

export interface TaskAsset {
  path: string;
  isDir: boolean;
}

export interface Task extends Omit<Required<RawTemplate>, 'place' | 'name' | 'variables'> {
  templatePlace: string;
  variables?: Record<string, string>;
  state: TaskState;
  error: string;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
  expiresAt: string;
  links: TaskLink[];
  assets: TaskAsset[] | null;
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
  ttl?: number;
}

export interface CloneTaskRequest extends TaskId {
  isRun?: boolean;
}
