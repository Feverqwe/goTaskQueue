import {Box} from '@mui/material';
import type {Meta, StoryObj} from '@storybook/react-vite';
import React from 'react';
import SilentStatus from './SilentStatus';

const meta = {
  title: 'Components/SilentStatus',
  component: SilentStatus,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <>
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 'appBar',
            bgcolor: '#000',
            color: '#fff',
            p: 2,
            fontFamily: 'monospace',
          }}
        >
          $ running task output
        </Box>
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof SilentStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    status: 'loading',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    onRetry: () => {},
  },
};
