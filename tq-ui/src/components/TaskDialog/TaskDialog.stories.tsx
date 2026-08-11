import type {Meta, StoryObj} from '@storybook/react-vite';
import React from 'react';
import {MemoryRouter} from 'react-router-dom';
import {Task, TaskState} from '../types';
import TaskDialog from './TaskDialog';

const baseTask: Task = {
  id: 'a1b2c3d',
  label: 'Deploy task queue worker',
  group: 'Production',
  command:
    'deploy-tool release --environment production --service task-queue-worker --image registry.example.com/platform/task-queue-worker:2026.08.11 --strategy rolling --timeout 15m \\\n  --set FEATURE_TASK_RESOURCES=true \\\n  --set API_ENDPOINT=https://api.example.com/v1/tasks',
  templatePlace: 'deploy/worker',
  isPty: false,
  isOnlyCombined: true,
  isWriteLogs: true,
  isSingleInstance: false,
  isStartOnBoot: false,
  ttl: 0,
  state: TaskState.Idle,
  error: '',
  createdAt: '2026-08-11T10:30:00Z',
  startedAt: '0001-01-01T00:00:00Z',
  finishedAt: '0001-01-01T00:00:00Z',
  expiresAt: '0001-01-01T00:00:00Z',
  links: [
    {
      name: 'Release dashboard',
      type: 'url',
      url: 'https://example.com/releases/task-queue-worker',
      title: 'Open release dashboard',
    },
  ],
  assets: [{path: '/tmp/task-queue-worker.log', isDir: false}],
};

const meta = {
  title: 'Components/TaskDialog',
  component: TaskDialog,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    open: true,
    task: baseTask,
    onClose: () => {},
    onUpdate: () => {},
  },
  argTypes: {
    onClose: {control: false},
    onUpdate: {control: false},
  },
} satisfies Meta<typeof TaskDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Running: Story = {
  args: {
    task: {
      ...baseTask,
      state: TaskState.Started,
      startedAt: '2026-08-11T10:31:00Z',
    },
  },
};

export const Error: Story = {
  args: {
    task: {
      ...baseTask,
      state: TaskState.Error,
      error: 'The deployment command exited with status 1.',
      startedAt: '2026-08-11T10:31:00Z',
      finishedAt: '2026-08-11T10:31:12Z',
    },
  },
};

export const FinishedWithExpiration: Story = {
  args: {
    task: {
      ...baseTask,
      state: TaskState.Finished,
      startedAt: '2026-08-11T10:31:00Z',
      finishedAt: '2026-08-11T10:31:12Z',
      expiresAt: '2026-08-12T10:31:12Z',
    },
  },
};
