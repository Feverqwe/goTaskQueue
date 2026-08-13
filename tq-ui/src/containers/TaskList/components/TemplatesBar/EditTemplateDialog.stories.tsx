import type {Meta, StoryObj} from '@storybook/react-vite';
import {RawTemplate, TemplateFolder, TemplateType} from '../../../../components/types';
import EditTemplateDialog from './EditTemplateDialog';

const folder: TemplateFolder = {
  type: TemplateType.Folder,
  place: 'deploy',
  name: 'deploy',
  templates: [],
};

const deployTemplate: RawTemplate = {
  place: 'deploy/worker',
  name: 'Deploy worker',
  id: 'deploy-worker',
  description:
    'Deploys the task queue worker to the selected environment. Production changes live traffic.',
  command:
    'deploy-tool release --environment "$TASK_VAR_ENVIRONMENT" --service task-queue-worker --image "$TASK_VAR_IMAGE"',
  label: 'Deploy worker to {{ vars.environment }}',
  group: 'Production',
  variables: [
    {
      name: 'Environment',
      value: 'environment',
      defaultValue: 'staging',
      type: 'select',
      options: ['development', 'staging', 'production'],
    },
    {
      name: 'Container image',
      value: 'image',
      defaultValue: 'registry.example.com/platform/task-queue-worker:latest',
    },
  ],
  isPty: false,
  isOnlyCombined: true,
  isWriteLogs: true,
  isSingleInstance: true,
  isStartOnBoot: false,
  ttl: 3600,
};

const meta = {
  title: 'TaskList/EditTemplateDialog',
  component: EditTemplateDialog,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    folder,
    open: true,
    template: deployTemplate,
    onClose: () => {},
    onSubmit: async () => {},
  },
  argTypes: {
    onClose: {control: false},
    onSubmit: {control: false},
  },
} satisfies Meta<typeof EditTemplateDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExistingTemplate: Story = {};

export const InvalidVariableReferences: Story = {
  args: {
    template: {
      ...deployTemplate,
      command: 'deploy-tool release --environment "$TASK_VAR_REGION"',
      label: 'Deploy worker to {{ vars.region }}',
    },
  },
};

export const NewTemplate: Story = {
  args: {
    isNew: true,
    template: {
      place: '',
      name: '',
      command: '',
      label: '',
      group: '',
      variables: [],
      isPty: false,
      isOnlyCombined: true,
      isWriteLogs: true,
      isSingleInstance: false,
      isStartOnBoot: false,
      ttl: 0,
    },
  },
};
