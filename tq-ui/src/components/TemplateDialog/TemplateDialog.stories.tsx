import type {Meta, StoryObj} from '@storybook/react-vite';
import React from 'react';
import {RootStoreCtx} from '../RootStore/RootStoreCtx';
import {RawTemplate} from '../types';
import TemplateDialog from './TemplateDialog';

const deployTemplate: RawTemplate = {
  place: 'deploy/worker',
  name: 'Deploy task queue worker',
  command:
    'deploy-tool release --environment ${environment} --service task-queue-worker --image ${image} --strategy rolling --timeout 15m',
  label: 'Deploy worker',
  group: 'Production',
  variables: [
    {name: 'Environment', value: 'environment', defaultValue: 'staging'},
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
