import {TemplateVariable, TemplateVariableType} from '../../../../../components/types';

export interface EditorVariable extends Omit<TemplateVariable, 'options'> {
  editorId: string;
  optionsText: string;
  type: TemplateVariableType;
}

export interface TemplateEditorValues {
  command: string;
  group: string;
  id: string;
  isOnlyCombined: boolean;
  isPty: boolean;
  isSingleInstance: boolean;
  isStartOnBoot: boolean;
  isWriteLogs: boolean;
  label: string;
  name: string;
  place: string;
  ttl: number | string;
  variables: EditorVariable[];
}

export type EditorTab = 'general' | 'variables' | 'command' | 'settings';
