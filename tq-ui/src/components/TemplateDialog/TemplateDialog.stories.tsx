import type {Meta, StoryObj} from '@storybook/react-vite';
import React from 'react';
import {RootStoreCtx} from '../RootStore/RootStoreCtx';
import {RawTemplate} from '../types';
import TemplateDialog from './TemplateDialog';

const deployTemplate: RawTemplate = {
  place: 'deploy/worker',
  name: 'Deploy task queue worker',
  description:
    'Deploys the task queue worker to the selected environment. Production changes live traffic.',
  command:
    'deploy-tool release --environment "$TASK_VAR_ENVIRONMENT" --service task-queue-worker --image "$TASK_VAR_IMAGE" --strategy rolling --timeout 15m',
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
  title: 'Components/TemplateDialog',
  component: TemplateDialog,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    open: true,
    template: deployTemplate,
    onClose: () => {},
    onSubmit: async () => {},
  },
  argTypes: {
    onClose: {control: false},
    onSubmit: {control: false},
  },
} satisfies Meta<typeof TemplateDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TemplateVariables: Story = {};

export const RunAs: Story = {
  args: {
    isRunAs: true,
  },
};

export const NewTask: Story = {
  args: {
    isNew: true,
    template: {
      ...deployTemplate,
      place: '',
      name: 'New task',
      variables: [],
      command: 'echo "Hello, world"',
      label: '',
      group: '',
      isSingleInstance: false,
      ttl: 0,
    },
  },
};

export const PtyUnsupported: Story = {
  decorators: [
    (Story) => (
      <RootStoreCtx.Provider
        value={{
          name: 'GoTaskQueue',
          templates: [],
          templateOrder: [],
          memStorage: {},
          isPtySupported: false,
          tasks: null,
        }}
      >
        <Story />
      </RootStoreCtx.Provider>
    ),
  ],
  args: {
    isNew: true,
    template: {
      ...deployTemplate,
      name: 'Run maintenance command',
      variables: [],
    },
  },
};
