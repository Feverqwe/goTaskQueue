import type {Meta, StoryObj} from '@storybook/react-vite';
import React from 'react';
import {MemoryRouter} from 'react-router-dom';
import {TemplatesCtx} from '../../../../components/TemplateProvider/TemplatesCtx';
import {TemplatesUpdateCtx} from '../../../../components/TemplateProvider/TemplatesUpdateCtx';
import {TemplateFolder, TemplateType} from '../../../../components/types';
import TemplatesBar from './TemplatesBar';

const rootFolder: TemplateFolder = {
  type: TemplateType.Folder,
  place: '',
  name: '',
  templates: [
    {
      place: 'quality/run tests',
      name: 'Run tests',
      command: 'go test ./...',
      variables: [],
    },
    {
      place: 'development/start services',
      name: 'Start services',
      command: 'docker compose up',
      variables: [],
    },
    {
      type: TemplateType.Folder,
      place: 'maintenance',
      name: 'Maintenance',
      templates: [],
    },
  ],
};

const meta = {
  title: 'Task list/Templates bar',
  component: TemplatesBar,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <TemplatesUpdateCtx.Provider value={async () => {}}>
          <TemplatesCtx.Provider
            value={{
              rootFolder,
              templates: [],
              templateOrder: [],
            }}
          >
            <Story />
          </TemplatesCtx.Provider>
        </TemplatesUpdateCtx.Provider>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'padded',
  },
  args: {
    onUpdate: () => {},
  },
  argTypes: {
    onUpdate: {control: false},
  },
} satisfies Meta<typeof TemplatesBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
