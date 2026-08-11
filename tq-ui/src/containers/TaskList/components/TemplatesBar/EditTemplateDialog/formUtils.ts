import {RawTemplate, TemplateVariable} from '../../../../../components/types';
import {EditorVariable, TemplateEditorValues} from './types';

let nextVariableId = 0;

const VARIABLE_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const CASE_INSENSITIVE_VARIABLE_KEY_PATTERN = /^[a-z][a-z0-9_]*$/i;
const COMMAND_VARIABLE_PATTERN = /\bTASK_VAR_([a-z][a-z0-9_]*)\b/gi;
const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*vars\.([^{}\s]+)\s*\}\}/g;

type TemplateReferenceErrors = Partial<Record<'command' | 'group' | 'label', string>>;

const getVariableKeys = (variables: EditorVariable[]) =>
  new Set(variables.map(({value}) => value.trim()).filter(Boolean));

const getTemplateReferences = (value: string) =>
  [...value.matchAll(TEMPLATE_VARIABLE_PATTERN)].map((match) => match[1]);

const unique = (values: string[]) => [...new Set(values)];

const validateTextReferences = (value: string, variableKeys: Set<string>) => {
  const references = getTemplateReferences(value);
  const invalidKey = references.find((key) => !VARIABLE_KEY_PATTERN.test(key));
  if (invalidKey) {
    return `Use lowercase variable keys, for example: {{ vars.${invalidKey.toLowerCase()} }}`;
  }

  const missingKeys = unique(references.filter((key) => !variableKeys.has(key)));
  if (missingKeys.length > 0) {
    return `Create variable ${missingKeys.length === 1 ? 'key' : 'keys'}: ${missingKeys.join(', ')}`;
  }

  if (/\{\{\s*vars\./.test(value.replace(TEMPLATE_VARIABLE_PATTERN, ''))) {
    return 'Invalid variable placeholder. Use, for example: {{ vars.environment }}';
  }

  return undefined;
};

const validateCommandReferences = (command: string, variableKeys: Set<string>) => {
  const templateReferences = getTemplateReferences(command);
  if (templateReferences.length > 0) {
    const key = templateReferences[0];
    const environmentName = CASE_INSENSITIVE_VARIABLE_KEY_PATTERN.test(key)
      ? `TASK_VAR_${key.toUpperCase()}`
      : 'TASK_VAR_NAME';
    return `Commands use environment variables. Replace {{ vars.${key} }} with ${environmentName}`;
  }

  const references = [...command.matchAll(COMMAND_VARIABLE_PATTERN)];
  const invalidCase = references.find((match) => match[0] !== match[0].toUpperCase());
  if (invalidCase) {
    return `Use uppercase environment variable names: ${invalidCase[0].toUpperCase()}`;
  }

  const missingKeys = unique(
    references.map((match) => match[1].toLowerCase()).filter((key) => !variableKeys.has(key)),
  );
  if (missingKeys.length > 0) {
    return `Create variable ${missingKeys.length === 1 ? 'key' : 'keys'}: ${missingKeys.join(', ')}`;
  }

  return undefined;
};

export const createVariable = (): EditorVariable => ({
  editorId: `new-variable-${nextVariableId++}`,
  name: '',
  value: '',
  defaultValue: '',
  type: 'text',
  optionsText: '',
});

export const parseOptions = (optionsText: string): string[] => [
  ...new Set(
    optionsText
      .split('\n')
      .map((option) => option.trim())
      .filter(Boolean),
  ),
];

export const required = (value: string | undefined) => (value?.trim() ? undefined : 'Required');

export const variableKey = (value: string | undefined) => {
  if (!value?.trim()) return 'Required';
  return VARIABLE_KEY_PATTERN.test(value)
    ? undefined
    : 'Use lowercase letters, numbers, and underscores';
};

export const validateTemplateReferences = (
  values: TemplateEditorValues,
): TemplateReferenceErrors => {
  const variableKeys = getVariableKeys(values.variables);

  return {
    command: validateCommandReferences(values.command, variableKeys),
    group: validateTextReferences(values.group, variableKeys),
    label: validateTextReferences(values.label, variableKeys),
  };
};

export const getInitialValues = (template: RawTemplate): TemplateEditorValues => ({
  command: template.command,
  group: template.group || '',
  id: template.id || '',
  isOnlyCombined: Boolean(template.isOnlyCombined),
  isPty: Boolean(template.isPty),
  isSingleInstance: Boolean(template.isSingleInstance),
  isStartOnBoot: Boolean(template.isStartOnBoot),
  isWriteLogs: Boolean(template.isWriteLogs),
  label: template.label || '',
  name: template.name || '',
  place: template.place || '',
  ttl: template.ttl ?? 0,
  variables: template.variables.map((variable, index) => ({
    ...variable,
    editorId: `template-variable-${index}`,
    type: variable.type === 'select' ? 'select' : 'text',
    optionsText: variable.options?.join('\n') || '',
  })),
});

export const getTemplateVariables = (variables: EditorVariable[]): TemplateVariable[] =>
  variables.map((variable) => {
    if (variable.type === 'select') {
      const options = parseOptions(variable.optionsText);
      return {
        name: variable.name.trim(),
        value: variable.value.trim(),
        defaultValue: options.includes(variable.defaultValue || '')
          ? variable.defaultValue
          : options[0] || '',
        type: 'select',
        options,
      };
    }

    return {
      name: variable.name.trim(),
      value: variable.value.trim(),
      defaultValue: variable.defaultValue || '',
    };
  });
