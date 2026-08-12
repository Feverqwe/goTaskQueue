import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button, Stack} from '@mui/material';
import React, {useContext} from 'react';
import {NotificationCtx} from './NotificationCtx';
import NotificationProvider from './NotificationProvider';

const ToastActions = () => {
  const showToast = useContext(NotificationCtx);

  return (
    <Stack direction="row" spacing={1}>
      <Button
        variant="outlined"
        onClick={() =>
          showToast({
            severity: 'success',
            label: 'Template saved',
            title: 'Deploy task queue worker',
            autoHideDuration: null,
          })
        }
      >
        Show success
      </Button>
      <Button
        color="error"
        variant="outlined"
        onClick={() =>
          showToast({
            severity: 'error',
            label: 'Task failed',
            title: 'Deploy task queue worker',
            message: 'The command exited with status 1.',
            autoHideDuration: null,
          })
        }
      >
        Show error
      </Button>
    </Stack>
  );
};

const meta = {
  title: 'Components/Notifications/NotificationProvider',
  component: NotificationProvider,
  args: {
    children: <ToastActions />,
  },
  argTypes: {
    children: {control: false},
  },
} satisfies Meta<typeof NotificationProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ManualEvents: Story = {};
