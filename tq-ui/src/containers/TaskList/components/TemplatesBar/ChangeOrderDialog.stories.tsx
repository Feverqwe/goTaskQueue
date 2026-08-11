import type {Meta, StoryObj} from '@storybook/react-vite';
import React from 'react';
import {TemplatesCtx} from '../../../../components/TemplateProvider/TemplatesCtx';
import {RawTemplate, TemplateType} from '../../../../components/types';
import ChangeOrderDialog from './ChangeOrderDialog';

const templates: RawTemplate[] = [
  {
    place: 'development/start services',
    name: 'Start services',
    command: 'docker compose up',
    variables: [],
  },
  {
    place: 'quality/run tests',
    name: 'Run tests',
    command: 'go test ./...',
    variables: [],
  },
  {
    place: 'production/deploy worker',
    name: 'Deploy worker',
    command: './scripts/deploy.sh worker',
    variables: [],
  },
  {
    place: 'maintenance/clean logs',
    name: 'Clean logs',
    command: './scripts/clean-logs.sh',
    variables: [],
  },
  {
    place: 'maintenance/backup database',
    name: 'Backup database',
    command: './scripts/backup.sh',
    variables: [],
  },
];

const meta = {
  title: 'Task list/Template order dialog',
  component: ChangeOrderDialog,
  decorators: [
    (Story) => (
      <TemplatesCtx.Provider
        value={{
          rootFolder: {type: TemplateType.Folder, place: '', name: '', templates: []},
          templates,
          templateOrder: templates.map(({place}) => place),
        }}
      >
        <Story />
      </TemplatesCtx.Provider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    open: true,
    onClose: () => {},
    onSubmit: async () => {},
  },
  argTypes: {
    onClose: {control: false},
    onSubmit: {control: false},
  },
} satisfies Meta<typeof ChangeOrderDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
